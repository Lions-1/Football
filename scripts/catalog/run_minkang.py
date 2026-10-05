"""Stage 2 (Minkang) — turn each downloaded album into the product photos.

The owner's client chose Minkang's own studio look (2026-10-03):
  1-2. front + back exactly as shot (dark studio wall, mannequin) — these
       photos carry no stamp, nothing is altered;
  3-5. up to 3 close-ups of pure fabric (crest / sponsor / brand logo) with the
       Yupoo text stamp inverted out (dewatermark.py), shown full-bleed.

Photo roles are found automatically (calibrated 2026-10-03 on 5 hand-labelled
albums, 47 photos, 0 errors):
  - FULL  = mostly studio wall (>= 50% of the frame) and the GPU cut-out is a
            centred subject (25-50% of the frame, not touching left/right)
  - CLOSE = (almost) no wall, cut-out doesn't touch the top edge (rejects
            collar/sleeve shots with the mannequin). On these the cut-out
            isolates the logo, so its size ranks crest/sponsor shots first.
Override per product in PICKS when the review sheet shows a bad choice.

Writes work/out_minkang/<slug>/grey/n.webp, work/results.json (the file
publish.mjs reads) and review sheets work/minkang/review_*.jpg.

  .venv\\Scripts\\python run_minkang.py              # all products in the manifest
  .venv\\Scripts\\python run_minkang.py napoli-26-27-home
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

sys.path.insert(0, str(Path(__file__).parent))
import dewatermark  # noqa: E402
import process as P  # noqa: E402

HERE = Path(__file__).parent
WORK = HERE / "work"
SRC = WORK / "minkang" / "src"
OUT = WORK / "out_minkang"
VARIANT = "grey"     # folder name publish.mjs reads (the backdrop is now the studio's own)
MAX_CLOSE = 3

# manual overrides: slug -> ([front, back], [close-ups...]) by photo number
PICKS: dict[str, tuple[list[int], list[int]]] = {
    # stock retros (older shoots: back is the last photo, crest close-ups missed)
    "france-2006-away-retro": ([1, 7], [4, 5, 3]),
    "fc-barcelona-14-15-home-retro": ([1, 8], [5, 6, 4]),
    "fc-barcelona-07-08-home-retro": ([1, 8], [5, 6, 4]),
    "argentina-2006-away-retro": ([1, 7], [4, 5]),
    "celtic-98-99-home-retro": ([1, 6], [3, 4]),
}


def features(src: Image.Image) -> dict:
    from rembg import remove
    a = np.array(remove(src, session=P._rembg_session()).getchannel("A")) > 128
    hsv = np.array(src.convert("HSV")).astype(float)
    g = np.array(src.convert("L")).astype(float)
    std = np.sqrt(np.clip(nd.uniform_filter(g * g, 9) - nd.uniform_filter(g, 9) ** 2, 0, None))
    return {
        "cov": float(a.mean()),
        "lr": float(np.concatenate([a[:, 0], a[:, -1]]).mean()),
        "top": float(a[0].mean()),
        # Minkang's studio wall: smooth, grey, mid-dark
        "wall": float(((hsv[..., 1] < 45) & (g > 35) & (g < 150) & (std < 4)).mean()),
    }


def role(f: dict) -> str:
    if f["wall"] >= 0.50 and f["lr"] <= 0.01 and 0.25 <= f["cov"] <= 0.50:
        return "full"
    if f["wall"] <= 0.07 and f["top"] <= 0.05 and f["lr"] <= 0.25:
        return "close"
    return "skip"


def auto_pick(photos: dict[int, Path]) -> tuple[list[int], list[int], dict]:
    feats, fulls, closes = {}, [], []
    for n, p in sorted(photos.items()):
        src = Image.open(p).convert("RGB")
        f = features(src)
        f["role"] = r = role(f)
        if r == "close" and src.size != dewatermark.SIZE:
            # the stamp model is exact only on 1000x1000 uploads (1 photo in 212 differs)
            f["role"] = r = "skip"
            f["note"] = f"odd size {src.size}"
        feats[n] = f
        if r == "full":
            fulls.append(n)
        elif r == "close":
            closes.append(n)
    # biggest logo first (crest / sponsor), then album order
    closes.sort(key=lambda n: -feats[n]["cov"])
    return fulls[:2], closes[:MAX_CLOSE], feats


def square(img: Image.Image) -> Image.Image:
    return P.render_detail(img)


def render(slug: str, fulls: list[int], closes: list[int], photos: dict[int, Path]) -> list[Image.Image]:
    imgs = [square(Image.open(photos[n]).convert("RGB")) for n in fulls]
    for n in closes:
        img = Image.open(photos[n]).convert("RGB")
        imgs.append(square(dewatermark.remove(img)))
    return imgs


def review(rows: list[tuple[str, list[Path]]], path: Path) -> None:
    T = 240
    sheet = Image.new("RGB", (5 * T + 260, len(rows) * T), "white")
    d = ImageDraw.Draw(sheet)
    for y, (slug, files) in enumerate(rows):
        d.text((6, y * T + 8), slug.replace("-26-27-", "\n26-27 ").replace("-2026-", "\n2026 "), fill="black")
        for x, f in enumerate(files):
            sheet.paste(Image.open(f).resize((T - 4, T - 4), Image.LANCZOS), (260 + x * T, y * T))
    sheet.save(path, quality=86)


def main(only: list[str], manifest_name: str = "manifest.json") -> None:
    manifest = json.loads((WORK / "minkang" / manifest_name).read_text("utf8"))
    tag = "" if manifest_name == "manifest.json" else Path(manifest_name).stem.replace("manifest_", "") + "_"
    res_path = WORK / "results.json"
    if not (WORK / "results_wanfing.json").exists() and res_path.exists():
        shutil.copy(res_path, WORK / "results_wanfing.json")
    old = {r["slug"]: r for r in json.loads(res_path.read_text("utf8"))} if res_path.exists() else {}
    results = {s: r for s, r in old.items() if r.get("source") == "minkang"}
    log, rows = {}, []
    for m in manifest:
        slug = m["slug"]
        if only and slug not in only:
            if slug in results and not tag:
                rows.append((slug, [HERE / f for f in results[slug]["files"][VARIANT]]))
            continue
        photos = {int(p.stem): p for p in (SRC / slug).iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")}
        fulls, closes, feats = auto_pick(photos)
        if slug in PICKS:
            fulls, closes = PICKS[slug]
        elif len(fulls) < 2 and len(photos) >= 2:
            # older uploads (hanger on a light wall) don't look like the studio
            # shots: fall back to the album order, front then back
            fulls = sorted(photos)[:2]
            closes = [n for n in closes if n not in fulls]
            feats["fallback"] = "front/back by album order"
        # flag = don't publish (publish.mjs skips flagged). A kit the supplier
        # has only shot front+back is fine to sell; a missing front/back isn't.
        flag = f"only {len(fulls)} front/back shot(s)" if len(fulls) < 2 else None
        note = f"{len(closes)} close-up(s)" if len(closes) < 2 else None
        imgs = render(slug, fulls, closes, photos)
        out = OUT / slug / VARIANT
        shutil.rmtree(out, ignore_errors=True)
        out.mkdir(parents=True)
        files = []
        for i, im in enumerate(imgs):
            if P.SHARPEN:
                im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=2))
            f = out / f"{i + 1}.webp"
            im.save(f, "WEBP", quality=P.WEBP_QUALITY, method=6)
            files.append(str(f.relative_to(HERE)).replace("\\", "/"))
        results[slug] = {"slug": slug, "team": m["team"], "kit": m["kit"], "season": m["season"],
                         "album": m["album"], "title": m["title"], "source": "minkang",
                         "full": len(fulls), "detail": len(closes), "flag": flag, "note": note,
                         "files": {VARIANT: files},
                         **{k: m[k] for k in ("brand", "category", "season_text", "player", "price") if k in m}}
        log[slug] = {"fulls": fulls, "closes": closes, "feats": feats}
        rows.append((slug, [HERE / f for f in files]))
        print(f"{slug:36s} front/back {fulls} close {closes}" + (f"  !! {flag}" if flag else f"  ({note})" if note else ""), flush=True)
    res_path.write_text(json.dumps(list(results.values()), indent=1), "utf8")
    (WORK / "minkang" / "picks_log.json").write_text(json.dumps(log, indent=1), "utf8")
    for i in range(0, len(rows), 8):
        review(rows[i:i + 8], WORK / "minkang" / f"review_{tag}{i // 8 + 1}.jpg")
    print(f"{len(results)} products, review sheets: work/minkang/review_*.jpg")


if __name__ == "__main__":
    args = sys.argv[1:]
    man = next((a for a in args if a.endswith(".json")), "manifest.json")
    main([a for a in args if not a.endswith(".json")], man)
