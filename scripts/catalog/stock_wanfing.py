"""Owner's stock shirts Minkang doesn't have, taken from Wanfing instead.

Matched by eye to the owner's photos (2026-10-07). Wanfing shoots on a hanger
in a wardrobe, so full shots are GPU cut-outs placed on a dark studio backdrop
that matches Minkang's wall (process.py variant "minkang"); close-ups stay
full-bleed like Minkang's. Adds the products to work/results.json (source
"wanfing-stock") for publish.mjs.

  .venv\\Scripts\\python stock_wanfing.py
"""
from __future__ import annotations

import json
import shutil
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import process as P  # noqa: E402
from select_albums import HDR, album_photos  # noqa: E402

HERE = Path(__file__).parent
WORK = HERE / "work"
SRC = WORK / "wanfing_stock" / "src"
OUT = WORK / "out_wanfing_stock"
PRICE_MAD = 350

# photos kept per product after review (no hangers / price tags); order = shown order
KEEP = {"spain-2026-away": [1, 3, 2, 4], "palmeiras-22-23-home": [1, 2, 3], "al-nassr-23-24-away": [1, 2, 3],
        "portugal-2024-away": [1, 3], "fc-barcelona-24-25-home": [1, 3], "fc-barcelona-24-25-away": [1, 2],
        "fc-barcelona-23-24-away": [1, 2]}
# (team slug, season label, season text, kit, album id, kit maker)
STOCK = [
    ("spain", "2026", "2026", "away", "230968348", "Adidas"),
    ("palmeiras", "22-23", "2022/23", "home", "128839404", "Puma"),
    ("al-nassr", "23-24", "2023/24", "away", "144168239", "Nike"),
    ("portugal", "2024", "2024", "away", "154703795", "Nike"),
    ("fc-barcelona", "24-25", "2024/25", "home", "164988153", "Nike"),
    ("fc-barcelona", "24-25", "2024/25", "away", "165646726", "Nike"),
    ("fc-barcelona", "23-24", "2023/24", "away", "136270256", "Nike"),
]


def download(url: str, dest: Path) -> None:
    for attempt in range(5):
        try:
            dest.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=60).read())
            return
        except Exception:
            time.sleep(2 + 3 * attempt)
    raise RuntimeError(f"download failed: {url}")


def main(only: list[str]) -> None:
    res_path = WORK / "results.json"
    results = {r["slug"]: r for r in json.loads(res_path.read_text("utf8"))}
    for team, label, season_text, kit, album, brand in STOCK:
        slug = f"{team}-{label}-{kit}"
        if only and slug not in only:
            continue
        d = SRC / slug
        d.mkdir(parents=True, exist_ok=True)
        paths = []
        for i, u in enumerate(album_photos(album)):
            f = d / f"{i + 1:02d}.{u.rsplit('.', 1)[1]}"
            if not f.exists():
                download(u, f)
                time.sleep(0.3)
            paths.append(str(f))
        out = OUT / slug
        shutil.rmtree(out, ignore_errors=True)
        written, n_full, n_detail = P.process_product(paths, str(out), ("minkang",))
        files = [str(Path(f).relative_to(HERE)).replace("\\", "/") for f in written["minkang"]]
        if slug in KEEP:
            files = [files[n - 1] for n in KEEP[slug]]
        results[slug] = {"slug": slug, "team": team, "kit": kit, "season": label, "album": album,
                         "title": "stock (wanfing)", "source": "wanfing-stock", "full": n_full, "detail": n_detail,
                         "flag": None if n_full >= 1 else "no full shot", "files": {"grey": files},
                         "brand": brand, "category": "jersey", "season_text": season_text,
                         "player": False, "price": PRICE_MAD}
        print(f"{slug:32s} {len(paths)} photos -> {n_full} full + {n_detail} close-up", flush=True)
    res_path.write_text(json.dumps(list(results.values()), indent=1), "utf8")


if __name__ == "__main__":
    main(sys.argv[1:])
