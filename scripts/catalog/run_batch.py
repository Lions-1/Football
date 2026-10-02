"""
Stage 2 — download each selected album and process its photos.

Reads work/manifest.json, writes work/out/<product-slug>/<variant>/<n>.webp
and work/results.json, then builds review sheets (work/review_<variant>.jpg).
Safe to re-run: downloads are cached in work/src/.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

import process

HDR = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36",
       "Referer": "https://wanfing.x.yupoo.com/"}
WORK = Path("work")
VARIANTS = ("white",)
MAX_DOWNLOAD = 12  # photos fetched per album (enough to find 3 full + 2 detail)


def slug_for(item: dict) -> str:
    return f"{item['team']}-26-27-{item['kit']}"


def download(urls: list[str], dest: Path) -> list[str]:
    dest.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, u in enumerate(urls[:MAX_DOWNLOAD], 1):
        f = dest / f"{i:02d}.{u.rsplit('.', 1)[-1]}"
        if not f.exists():
            for attempt in range(3):
                try:
                    data = urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=60).read()
                    f.write_bytes(data)
                    break
                except Exception:
                    time.sleep(1 + attempt)
            time.sleep(0.2)  # be polite to Yupoo
        if f.exists():
            paths.append(str(f))
    return paths


def review_sheet(results: list[dict], variant: str) -> None:
    W, cols = 220, 5
    rows = [r for r in results if r["files"].get(variant)]
    sheet = Image.new("RGB", (cols * W + 260, len(rows) * W), "white")
    d = ImageDraw.Draw(sheet)
    for y, r in enumerate(rows):
        d.text((6, y * W + 8), r["slug"], fill="black")
        d.text((6, y * W + 26), f"{r['full']} full / {r['detail']} detail", fill="red" if r["flag"] else "gray")
        for x, f in enumerate(r["files"][variant][:cols]):
            im = Image.open(f).convert("RGB")
            im.thumbnail((W - 6, W - 6))
            sheet.paste(im, (260 + x * W + 3, y * W + 3))
    sheet.save(WORK / f"review_{variant}.jpg", quality=80)


def main(only: list[str]) -> None:
    manifest = json.loads((WORK / "manifest.json").read_text(encoding="utf-8"))
    results = []
    t0 = time.time()
    for item in manifest:
        slug = slug_for(item)
        if only and slug not in only and item["team"] not in only:
            continue
        srcs = download(item["photo_urls"], WORK / "src" / item["album"])  # cache per album
        files, n_full, n_detail = process.process_product(srcs, str(WORK / "out" / slug), VARIANTS)
        # flag: no clean full shot for the cover, or too few photos overall
        flag = n_full == 0 or (n_full + n_detail) < 3
        results.append({"slug": slug, "team": item["team"], "kit": item["kit"], "album": item["album"],
                        "title": item["title"], "files": files, "full": n_full, "detail": n_detail,
                        "flag": flag})
        print(f"  {slug:40} {n_full} full + {n_detail} detail{'   <-- CHECK' if flag else ''}", flush=True)
    (WORK / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    for v in VARIANTS:
        review_sheet(results, v)
    print(f"\n{len(results)} products in {time.time() - t0:.0f}s — "
          f"{sum(r['flag'] for r in results)} flagged (<3 images)")


if __name__ == "__main__":
    main(sys.argv[1:])
