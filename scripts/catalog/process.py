"""
Product photo processor for the Yupoo catalog pipeline.

For each source photo:
  1. Remove the background locally with rembg (free, runs on this PC).
  2. Classify it: FULL shot (whole jersey visible, background around it) vs
     DETAIL close-up (crest / fabric / tag — nothing to cut out).
  3. FULL  -> cut-out jersey centred on a clean studio backdrop + soft shadow.
     DETAIL -> centre square crop, kept as-is.
  4. Stamp the mebutiksports watermark (4 corners + big diagonal centre),
     matching the style of the photos already on the site.
  5. Save 800x800 WebP (small files — they are served from storage, never
     inlined into HTML or stored as base64 in the database).

Usage (library):  process_product(paths, out_dir, variant="light")
Usage (CLI):      python process.py OUT_DIR VARIANT img1 img2 ...
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SIZE = 800
FONT_PATH = r"C:\Windows\Fonts\MTCORSVA.TTF"  # Monotype Corsiva ~ site watermark
BRAND = "mebutiksports"
PHONE = "+212 628 552 405"

# Backdrop palettes: (centre colour, edge colour)
VARIANTS = {
    "white": ((255, 255, 255), (240, 240, 240)),  # owner's choice: clean white
    "light": ((243, 243, 243), (214, 214, 214)),  # light grey
    "studio": ((112, 112, 112), (58, 58, 58)),    # matches older grey photos
}

MAX_FULL = 3     # full jersey shots per product
MAX_DETAIL = 2   # close-up shots per product

MODEL = "birefnet-general-lite"  # MIT-licensed, clean product cut-outs
_session = None


def _rembg_session():
    """BiRefNet on the NVIDIA GPU (CUDA), falling back to CPU if unavailable."""
    global _session
    if _session is None:
        import onnxruntime as ort
        try:
            ort.preload_dlls()  # CUDA/cuDNN DLLs shipped as pip packages
        except Exception:
            pass
        from rembg import new_session
        _session = new_session(MODEL, providers=[
            ("CUDAExecutionProvider", {"cudnn_conv_algo_search": "HEURISTIC",
                                       "cudnn_conv_use_max_workspace": "0",
                                       "arena_extend_strategy": "kSameAsRequested"}),
            "CPUExecutionProvider"])
        # Shrink the GPU memory pool after every image: without this the pool
        # fills the 6 GB card and Windows starts paging VRAM (10x slowdown).
        ro = ort.RunOptions()
        ro.add_run_config_entry("memory.enable_memory_arena_shrinkage", "gpu:0")
        run = _session.inner_session.run
        _session.inner_session.run = lambda out, feed, run_options=None: run(out, feed, ro)
    return _session


def _gradient(variant: str) -> Image.Image:
    centre, edge = VARIANTS[variant]
    # radial gradient: centre colour in the middle fading to edge colour
    mask = Image.radial_gradient("L").resize((SIZE, SIZE))  # 0 centre .. 255 edge
    a = Image.new("RGB", (SIZE, SIZE), centre)
    b = Image.new("RGB", (SIZE, SIZE), edge)
    return Image.composite(b, a, mask)


def keep_main_subject(cut: Image.Image) -> Image.Image:
    """Drop stray blobs (rack poles, shelf edges): keep the largest connected
    region of the mask plus anything sizeable that overlaps its bounding box
    (so a hanger hook attached above the shirt survives)."""
    import numpy as np
    from scipy import ndimage

    a = np.array(cut.getchannel("A"))
    labels, n = ndimage.label(a > 128)
    if n <= 1:
        return cut
    sizes = ndimage.sum(np.ones_like(a), labels, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    ys, xs = np.where(labels == main)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    keep = labels == main
    for i in range(1, n + 1):
        if i == main or sizes[i - 1] < sizes[main - 1] * 0.02:
            continue
        cy, cx = ndimage.center_of_mass(labels == i)
        if y0 <= cy <= y1 and x0 <= cx <= x1:
            keep |= labels == i
    out = cut.copy()
    out.putalpha(Image.fromarray(np.where(keep, a, 0).astype("uint8")))
    return out


def shape_metrics(a) -> tuple[float, float]:
    """(neck, extent) of a subject mask.
    neck   = width of the top 6% of the subject / its max width. A shirt on a
             hanger or a mannequin starts with a narrow hook/neck (~0.13-0.20).
    extent = mask area / (height x max width). A shirt with sleeves is 'bumpy'
             (~0.55-0.72); crests, care tags and fabric blobs are compact (>=0.75)."""
    import numpy as np

    ys = np.where(a.any(axis=1))[0]
    if len(ys) < 10:
        return 1.0, 1.0
    rows = a[ys.min(): ys.max() + 1]
    widths = np.array([np.ptp(np.where(r)[0]) + 1 if r.any() else 0 for r in rows])
    gmax = widths.max()
    neck = widths[: max(1, int(len(widths) * 0.06))].mean() / gmax
    extent = rows.sum() / (len(widths) * gmax)
    return float(neck), float(extent)


def symmetry(a) -> float:
    """Left-right mirror overlap (IoU) of the subject. Front/back shirt shots
    score 0.92-0.99; lopsided fabric swatches ~0.3."""
    import numpy as np

    ys, xs = np.where(a)
    if len(ys) == 0:
        return 0.0
    sub = a[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
    flip = sub[:, ::-1]
    return float((sub & flip).sum() / max(1, (sub | flip).sum()))


def classify(cut: Image.Image, src: Image.Image) -> tuple[str, tuple | None]:
    """FULL = whole shirt (front/back) on a hanger or mannequin; DETAIL = rest.

    Calibrated on real Wanfing albums, both fan (hanger) and player (black
    mannequin) shoots — see _features.py:
      - removed background is a light, low-saturation wall (not fabric)
      - subject does not run off the left/right/bottom edges
      - sensible size: 15-45% of the frame, 55-90% of the frame height
      - narrow hook/neck at the top (neck <= 0.40) and a bumpy sleeved outline
        (extent <= 0.74): rejects crests, care tags, logos and fabric close-ups,
        including ones photographed on WHITE shirts
      - left-right symmetric (>= 0.80): rejects lopsided fabric swatches."""
    import numpy as np

    a = np.array(cut.getchannel("A")) > 128
    h, w = a.shape
    coverage = a.mean()
    touch = np.concatenate([a[:, 0], a[:, -1], a[-1, :]]).mean()
    bg = ~a
    if bg.sum() < 0.1 * h * w:
        return "detail", None
    hsv = np.array(src.convert("HSV"))
    plain_wall = hsv[..., 1][bg].mean() / 255 < 0.22 and hsv[..., 2][bg].mean() / 255 > 0.45
    ys = np.where(a.any(axis=1))[0]
    height = (ys.max() - ys.min() + 1) / h if len(ys) else 0
    neck, extent = shape_metrics(a)
    bbox = cut.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
    if (plain_wall and touch <= 0.15 and 0.15 <= coverage <= 0.45
            and 0.55 <= height <= 0.90 and neck <= 0.40 and extent <= 0.74
            and symmetry(a) >= 0.80 and bbox):
        return "full", bbox
    return "detail", bbox


def is_care_tag(cut: Image.Image) -> bool:
    """Care-label close-ups cut out as a compact rectangle — skip as a detail."""
    import numpy as np

    a = np.array(cut.getchannel("A")) > 128
    cov = a.mean()
    _, extent = shape_metrics(a)
    return extent >= 0.80 and 0.10 <= cov <= 0.40


def render_full(cut: Image.Image, bbox, variant: str) -> Image.Image:
    subj = cut.crop(bbox)
    # fit inside a box leaving breathing room (slightly lower than centre)
    scale = min(640 / subj.width, 690 / subj.height)
    subj = subj.resize((max(1, int(subj.width * scale)), max(1, int(subj.height * scale))), Image.LANCZOS)
    canvas = _gradient(variant).convert("RGBA")
    x = (SIZE - subj.width) // 2
    y = (SIZE - subj.height) // 2 + 15
    # soft drop shadow for depth (keeps white kits readable on light backdrop)
    shadow_alpha = subj.getchannel("A").filter(ImageFilter.GaussianBlur(16)).point(lambda a: int(a * 0.35))
    shadow = Image.new("RGBA", subj.size, (0, 0, 0, 255))
    shadow.putalpha(shadow_alpha)
    canvas.alpha_composite(shadow, (x + 6, y + 14))
    canvas.alpha_composite(subj, (x, y))
    return canvas.convert("RGB")


def render_detail(src: Image.Image) -> Image.Image:
    s = min(src.size)
    l = (src.width - s) // 2
    t = (src.height - s) // 2
    return src.crop((l, t, l + s, t + s)).resize((SIZE, SIZE), Image.LANCZOS).convert("RGB")


def _text_layer(text: str, font: ImageFont.FreeTypeFont, angle: float, fill, stroke, sw: int = 1):
    tmp = Image.new("RGBA", (10, 10))
    l, t, r, b = ImageDraw.Draw(tmp).textbbox((0, 0), text, font=font, stroke_width=sw)
    layer = Image.new("RGBA", (r - l + 8, b - t + 8), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((4 - l, 4 - t), text, font=font, fill=fill,
                               stroke_width=sw, stroke_fill=stroke)
    return layer.rotate(angle, expand=True, resample=Image.BICUBIC)


def watermark(img: Image.Image, variant: str) -> Image.Image:
    base = img.convert("RGBA")
    over = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sw = 1
    if variant == "white":
        # white text + soft grey outline: readable on the white backdrop AND on
        # dark shirts (plain white text would vanish on white)
        fill, stroke, sw = (255, 255, 255, 170), (120, 120, 120, 120), 2
    elif variant == "light":
        fill, stroke = (255, 255, 255, 165), (60, 60, 60, 70)
    else:
        fill, stroke = (255, 255, 255, 140), (0, 0, 0, 40)

    small = ImageFont.truetype(FONT_PATH, 34)
    small_ph = ImageFont.truetype(FONT_PATH, 26)
    big = ImageFont.truetype(FONT_PATH, 96)
    big_ph = ImageFont.truetype(FONT_PATH, 44)

    # four corners (brand + phone stacked, slight tilt like the originals)
    for cx, cy in [(130, 75), (670, 75), (130, 735), (670, 735)]:
        b = _text_layer(BRAND, small, 6, fill, stroke, sw)
        p = _text_layer(PHONE, small_ph, 6, fill, stroke, sw)
        over.alpha_composite(b, (cx - b.width // 2, cy - b.height // 2 - 16))
        over.alpha_composite(p, (cx - p.width // 2, cy - p.height // 2 + 22))

    # big diagonal in the middle
    b = _text_layer(BRAND, big, 22, fill, stroke, sw)
    p = _text_layer(PHONE, big_ph, 22, fill, stroke, sw)
    over.alpha_composite(b, (SIZE // 2 - b.width // 2, SIZE // 2 - b.height // 2 - 10))
    over.alpha_composite(p, (SIZE // 2 - p.width // 2 + 30, SIZE // 2 - p.height // 2 + 75))

    base.alpha_composite(over)
    return base.convert("RGB")


def process_product(paths: list[str], out_dir: str,
                    variants: tuple[str, ...] = ("studio",)) -> tuple[dict[str, list[str]], int, int]:
    """Process one product's photos. Background removal runs once per photo;
    every requested backdrop variant is rendered from the same cut-out.
    Writes OUT_DIR/<variant>/<n>.webp (cover = 1).
    Returns (paths per variant, number of full shots, number of detail shots)."""
    from rembg import remove
    fulls, details = [], []  # cut-outs (with bbox) / square crops
    for p in paths:
        src = Image.open(p).convert("RGB")
        if max(src.size) > 1600:  # keep rembg fast on huge PNGs
            src.thumbnail((1600, 1600), Image.LANCZOS)
        cut = remove(src, session=_rembg_session())
        kind, bbox = classify(cut, src)
        if kind == "full" and len(fulls) < MAX_FULL:
            cut = keep_main_subject(cut)
            bbox = cut.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox() or bbox
            fulls.append((cut, bbox))
        elif kind == "detail" and len(details) < MAX_DETAIL and not is_care_tag(cut):
            details.append(render_detail(src))
        if len(fulls) >= MAX_FULL and len(details) >= MAX_DETAIL:
            break
    written: dict[str, list[str]] = {}
    for v in variants:
        out = Path(out_dir) / v
        out.mkdir(parents=True, exist_ok=True)
        imgs = [render_full(c, b, v) for c, b in fulls] + details
        written[v] = []
        for i, im in enumerate(imgs):
            f = out / f"{i + 1}.webp"
            watermark(im, v).save(f, "WEBP", quality=80, method=6)
            written[v].append(str(f))
    return written, len(fulls), len(details)


if __name__ == "__main__":
    out_dir, *imgs = sys.argv[1:]
    print(process_product(imgs, out_dir, ("studio", "light")))
