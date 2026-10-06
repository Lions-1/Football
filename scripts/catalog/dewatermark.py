"""Remove the fixed "minkang.x.yupoo.com" watermark from Minkang close-ups.

Yupoo stamps the same semi-transparent text at the same spot on every 1000px
upload:  I = a*c + (1-a)*J  (I = what we download, J = the real photo,
a = per-pixel opacity, c = watermark colour). With dozens of photos sharing the
stamp we can *measure* a and c, then invert it exactly: J = (I - a*c)/(1-a).
Unlike inpainting, the real fabric texture under the letters comes back
(nothing is invented).

  .venv\\Scripts\\python dewatermark.py fit   work/minkang/src   # -> work/minkang/wm.npz
  .venv\\Scripts\\python dewatermark.py apply <in.jpg> <out.png>
"""
from __future__ import annotations

import glob
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = Path(__file__).parent
MODEL = HERE / "work" / "minkang" / "wm.npz"
SIZE = (1000, 1000)
PAD = 8
FLAT_LO, FLAT_HI = 30.0, 110.0   # local variance: below LO = flat surface, above HI = textured fabric
CALIBRATE = False                # local self-calibration: tested worse on bright fabric (2026-10-03), off
GHOST_LO = 0.12                  # local correlation with the letter outlines that counts as a visible trace
HALO = 6                         # px around the letter outlines included in the fit (the stamp has a soft halo)


def _load(p) -> np.ndarray:
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.float32)


def _grad(a: np.ndarray) -> np.ndarray:
    g = a.mean(2)
    return np.hypot(nd.sobel(g, 1), nd.sobel(g, 0))


def _fill(I: np.ndarray, M: np.ndarray, sigma: float = 2.5) -> np.ndarray:
    """Rough estimate of the photo under mask M: normalised blur of the pixels around it."""
    w = (~M).astype(np.float32)
    den = nd.gaussian_filter(w, sigma) + 1e-6
    out = np.empty_like(I)
    for ch in range(3):
        out[..., ch] = nd.gaussian_filter(I[..., ch] * w, sigma) / den
    # pixels deep inside the mask: widen until covered
    hole = den < 0.05
    if hole.any():
        den2 = nd.gaussian_filter(w, sigma * 3) + 1e-6
        for ch in range(3):
            out[..., ch][hole] = (nd.gaussian_filter(I[..., ch] * w, sigma * 3) / den2)[hole]
    return out


def fit(*src_dirs: str) -> None:
    paths = [p for d in src_dirs for p in sorted(glob.glob(f"{d}/*/*")) if Image.open(p).size == SIZE]
    imgs = [_load(p) for p in paths]
    # median of SIGNED gradients: random fabric texture cancels out, the
    # stamp (same place in every photo) survives
    gx = np.median(np.stack([nd.sobel(a.mean(2), 1) for a in imgs]), 0)
    gy = np.median(np.stack([nd.sobel(a.mean(2), 0) for a in imgs]), 0)
    G = np.hypot(gx, gy)
    thr = G.max() * 0.25
    # the stamp = the biggest cluster of consistent edges (letters merge when
    # smeared horizontally); ignores stray edges elsewhere in the frame
    lab, n = nd.label(nd.binary_dilation(G > thr, np.ones((5, 81), bool)))
    big = np.argmax(nd.sum(np.ones_like(G), lab, range(1, n + 1))) + 1
    ys, xs = np.where((lab == big) & (G > thr))
    y0, y1, x0, x1 = ys.min() - PAD, ys.max() + PAD + 1, xs.min() - PAD, xs.max() + PAD + 1
    Gb = G[y0:y1, x0:x1]
    # candidate text region: outlines dilated so both sides of each stroke merge
    M = nd.binary_dilation(Gb > thr * 0.6, iterations=HALO)
    # only photos that actually carry the stamp (full shots don't)
    use = [a for a in imgs if np.corrcoef(_grad(a)[y0:y1, x0:x1].ravel(), Gb.ravel())[0, 1] > 0.12]
    Is = np.stack([a[y0:y1, x0:x1] for a in use])                  # k,h,w,3
    Js = np.stack([_fill(I, M) for I in Is])
    # how much to trust each estimate: flat fabric around the letters -> high
    tex = np.stack([_fill(I * I, M) for I in Is]) - Js ** 2
    w = 1.0 / (1.0 + np.clip(tex, 0, None) / 25.0)
    w = w * ((Is > 1) & (Is < 254))
    # per pixel, one line shared by R,G,B:  I = beta + gamma * J
    sw = w.sum((0, 3)) + 1e-6
    mI = (w * Is).sum((0, 3)) / sw
    mJ = (w * Js).sum((0, 3)) / sw
    cov = (w * (Is - mI[None, ..., None]) * (Js - mJ[None, ..., None])).sum((0, 3))
    var = (w * (Js - mJ[None, ..., None]) ** 2).sum((0, 3)) + 1e-6
    gamma = np.clip(cov / var, 0.25, 1.0)
    beta = mI - gamma * mJ
    gamma = np.where(M, gamma, 1.0)
    beta = np.where(M, beta, 0.0)
    np.savez(MODEL, beta=beta.astype(np.float32), gamma=gamma.astype(np.float32), box=np.array([y0, y1, x0, x1]))
    Image.fromarray((np.clip((1 - gamma) / max(1 - gamma.min(), 1e-3), 0, 1) * 255).astype(np.uint8)).save(MODEL.with_suffix(".png"))
    print(f"fit on {len(use)}/{len(imgs)} photos: max opacity {1 - gamma.min():.2f}, box y{y0}-{y1} x{x0}-{x1}")


_model = None


def _m():
    global _model
    _model = _model or dict(np.load(MODEL))
    return _model


def locate(img: Image.Image) -> tuple[int, int, float]:
    """Where the stamp sits: (dy, dx) shift of the fitted box, and match score.
    On 1000x1000 uploads it is exactly at the fitted box; other sizes (e.g.
    1000x1250) get it elsewhere, so search around the centred position."""
    m = _m()
    y0, y1, x0, x1 = (int(v) for v in m["box"])
    tmpl = _grad(np.repeat((1 - m["gamma"])[..., None], 3, 2) * 255).ravel()
    g = _grad(np.asarray(img.convert("RGB"), dtype=np.float32))
    H, W = g.shape

    def score(dy, dx):
        if y0 + dy < 0 or x0 + dx < 0 or y1 + dy > H or x1 + dx > W:
            return -1.0
        return float(np.corrcoef(g[y0 + dy:y1 + dy, x0 + dx:x1 + dx].ravel(), tmpl)[0, 1])

    if img.size == SIZE:
        return 0, 0, score(0, 0)
    best = (-1.0, 0, 0)
    for cy, cx in {((H - SIZE[1]) // 2, (W - SIZE[0]) // 2), (0, 0)}:
        for dy in range(cy - 40, cy + 41, 4):
            for dx in range(cx - 40, cx + 41, 4):
                best = max(best, (score(dy, dx), dy, dx))
    _, by, bx = best
    for dy in range(by - 3, by + 4):                 # refine to the pixel
        for dx in range(bx - 3, bx + 4):
            best = max(best, (score(dy, dx), dy, dx))
    return best[1], best[2], best[0]


def has_watermark(img: Image.Image) -> bool:
    return locate(img)[2] > 0.10


def _ycc(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    return y, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b


def _rgb(y, cb, cr):
    return np.stack([y + 1.402 * (cr - 128), y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128),
                     y + 1.772 * (cb - 128)], -1)


def _chroma_blur(full: np.ndarray) -> np.ndarray:
    """What JPEG 4:2:0 does to a sharp map: 2x2 average, then linear upsample."""
    h, w = full.shape
    small = full[: h // 2 * 2, : w // 2 * 2].reshape(h // 2, 2, w // 2, 2).mean((1, 3))
    up = nd.zoom(small, 2, order=1, grid_mode=True, mode="nearest")
    out = full.copy()
    out[: up.shape[0], : up.shape[1]] = up
    return out


def remove(img: Image.Image) -> Image.Image:
    """Invert the stamp. Images of another size are returned unchanged.

    Done the way the JPEG stores it: brightness at full resolution, colour at
    half resolution (so the colour correction uses the stamp blurred exactly
    like JPEG blurs colour -> no coloured fringes on letter edges).
    The fitted strength is right on average, but some surfaces (glossy white
    crests, printed patches) take the stamp a little harder or softer, so it
    is self-calibrated locally: in each neighbourhood pick the scale that
    leaves no trace of the letter pattern (zero correlation with the known
    letter shapes), then smooth that scale.
    """
    m = _m()
    # Minkang stamps every 1000x1000 close-up at the same spot: always invert
    # there (detection is weak on dark patterned fabric). Other sizes: search.
    dy, dx, sc = (0, 0, 1.0) if img.size == SIZE else locate(img)
    if sc <= 0.05 or (img.size != SIZE and sc <= 0.30):
        return img                                    # no stamp found (other-size uploads need a clear match)
    y0, y1, x0, x1 = (int(v) for v in m["box"])
    y0, y1, x0, x1 = y0 + dy, y1 + dy, x0 + dx, x1 + dx
    # work on an even-aligned, padded window so the chroma grid matches the JPEG's
    Y0, X0 = y0 - y0 % 2 - 8, x0 - x0 % 2 - 8
    Y1, X1 = y1 + 8 + (y1 % 2), x1 + 8 + (x1 % 2)
    beta = np.zeros((Y1 - Y0, X1 - X0), np.float32); gamma = np.ones_like(beta)
    beta[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = m["beta"]
    gamma[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = m["gamma"]
    arr = np.asarray(img.convert("RGB"), dtype=np.float32).copy()
    Yc, Cb, Cr = _ycc(arr[Y0:Y1, X0:X1])
    P = 1.0 - gamma
    c = np.where(P > 1e-3, beta / np.maximum(P, 1e-3), 0)   # stamp brightness per pixel
    hpP = P - nd.gaussian_filter(P, 3.0)
    win = lambda x: nd.gaussian_filter(x, 10.0)
    scales = np.linspace(0.5, 1.8, 27, dtype=np.float32)
    score = []
    for k in scales:
        Jk = (Yc - k * beta) / np.maximum(1 - k * P, 0.15)
        score.append(np.abs(win((Jk - nd.gaussian_filter(Jk, 3.0)) * hpP)))
    sbest = scales[np.argmin(np.stack(score), 0)]
    conf = np.clip(win(hpP * hpP) / (win(hpP * hpP).max() * 0.15), 0, 1)
    sm = np.clip(nd.gaussian_filter(sbest * conf + (1 - conf), 6.0), 0.5, 1.8) if CALIBRATE else np.ones_like(P)
    a = np.clip(sm * P, 0, 0.85)
    Yj = (Yc - a * c) / (1 - a)
    ac = np.clip(_chroma_blur(a), 0, 0.85)                  # stamp is neutral grey:
    Cbj = 128 + (Cb - 128) / (1 - ac)                       # it only pulls colour
    Crj = 128 + (Cr - 128) / (1 - ac)                       # toward grey
    J = _rgb(Yj, Cbj, Crj)
    # where the stamp is strongest, JPEG error is amplified: blend a little
    # toward the local estimate to hide ringing on letter edges
    est = _fill(J, P > 0.02, 1.2)
    w = np.clip((a - 0.3) / 0.4, 0, 0.4)[..., None]
    J = J * (1 - w) + est * w
    # flat surfaces (printed sponsor patch, smooth crest): JPEG error on the
    # letter edges still leaves a faint outline, but there the neighbours
    # predict the pixel perfectly -> fill the letters from them. Textured
    # fabric fails the flatness test and keeps the exact inversion.
    L = nd.binary_dilation(P > 0.02, iterations=2)
    fill = _fill(J, L, 2.0)
    var = (_fill(J * J, L, 2.0) - fill ** 2).clip(0).mean(-1)
    flat = np.clip((FLAT_HI - var) / (FLAT_HI - FLAT_LO), 0, 1)
    # ghost detector: where the result still correlates with the letter
    # outlines, a trace is left (e.g. embossed white crests) -> fill there too
    Yo = J.mean(-1)
    E = np.hypot(nd.sobel(P, 0), nd.sobel(P, 1))
    hY, hE = Yo - nd.gaussian_filter(Yo, 2.0), E - nd.gaussian_filter(E, 2.0)
    w6 = lambda x: nd.gaussian_filter(x, 6.0)
    corr = np.abs(w6(hY * hE)) / np.sqrt(w6(hY * hY) * w6(hE * hE) + 1e-3)
    ghost = np.clip((corr - GHOST_LO) / 0.15, 0, 1)
    flat = (np.maximum(flat, ghost) * L)[..., None]
    flat = nd.gaussian_filter(flat, (0.7, 0.7, 0))
    arr[Y0:Y1, X0:X1] = J * (1 - flat) + fill * flat
    return Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8))


if __name__ == "__main__":
    if sys.argv[1] == "fit":
        fit(*sys.argv[2:])
    else:
        remove(Image.open(sys.argv[2])).save(sys.argv[3])
