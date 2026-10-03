"""Minkang trial (2026-10-03): re-render chosen products from minkang.x.yupoo.com.

Their shoot is pro studio (mannequin, dark wall, macro close-ups). Front/back
shots: GPU cut-out onto the site backdrop, stand pole trimmed. Close-ups: the
Yupoo text stamp is inverted out (dewatermark.py) and the photo is shown
full-bleed (they are pure fabric — no wall to hide).

Updates work/results.json in place for these slugs (Wanfing version kept in
work/results_wanfing.json) so publish.mjs works unchanged.

  .venv\\Scripts\\python run_minkang.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
import dewatermark  # noqa: E402
import process as P  # noqa: E402

HERE = Path(__file__).parent
WORK = HERE / "work"
SRC = WORK / "minkang" / "src"
OUT = WORK / "out_minkang"
VARIANT = "grey"
# Owner's call (2026-10-03): keep Minkang's own dark studio background on the
# front/back shots (they carry no stamp) so the client compares light vs dark.
KEEP_STUDIO = True

# slug -> (full shots front/back, close-ups: crest, sponsor, brand) by photo number
PICKS = {
    "real-madrid-26-27-home": ([1, 2], [7, 8, 6]),
    "real-madrid-26-27-away": ([1, 2], [4, 5, 3]),
    "fc-barcelona-26-27-home": ([1, 2], [4, 5, 3]),
    "fc-barcelona-26-27-away": ([1, 2], [7, 8, 6]),
    "fc-barcelona-26-27-third": ([1, 9], [6, 7, 5]),
}


def trim_pole(cut: Image.Image) -> Image.Image:
    """Remove the thin display stand below the mannequin/shirt."""
    a = np.array(cut.getchannel("A")) > 128
    widths = a.sum(1)
    big = widths.max()
    rows = np.where(widths > 0)[0]
    # walk up from the bottom while the subject is only pole-thin
    y = rows.max()
    while y > rows.min() and widths[y] < big * 0.12:
        y -= 1
    if rows.max() - y < 8:
        return cut
    al = np.array(cut.getchannel("A"))
    al[y + 1:] = 0
    out = cut.copy()
    out.putalpha(Image.fromarray(al))
    return out


def full(path: Path) -> Image.Image:
    from rembg import remove
    src = Image.open(path).convert("RGB")
    if KEEP_STUDIO:
        return P.render_detail(src)
    cut = trim_pole(P.keep_main_subject(remove(src, session=P._rembg_session())))
    bbox = cut.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
    return P.render_full(cut, bbox, VARIANT)


def detail(path: Path) -> Image.Image:
    img = dewatermark.remove(Image.open(path).convert("RGB"))
    return P.render_detail(img)


def main() -> None:
    res_path = WORK / "results.json"
    backup = WORK / "results_wanfing.json"
    if not backup.exists():
        shutil.copy(res_path, backup)
    results = json.loads(res_path.read_text("utf8"))
    by_slug = {r["slug"]: r for r in results}
    for slug, (fulls, details) in PICKS.items():
        src = {int(p.stem): p for p in (SRC / slug).iterdir()}
        imgs = [full(src[n]) for n in fulls] + [detail(src[n]) for n in details]
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
        by_slug[slug]["files"][VARIANT] = files
        by_slug[slug]["source"] = "minkang"
        print(f"{slug}: {len(files)} images")
    res_path.write_text(json.dumps(results, indent=1), "utf8")


if __name__ == "__main__":
    main()
