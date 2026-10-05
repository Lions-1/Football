"""Match the owner's physical stock (phone photos) to Minkang albums.

Builds, per stock item, a strip: the stock photo + cover photos of the Minkang
albums found by text search, so a human (or Claude) can pick the right album.

  .venv\\Scripts\\python stock_match.py            # all items in ITEMS
  .venv\\Scripts\\python stock_match.py 9 23       # only these stock photo numbers
Output: work/stock/match_<n>.jpg + work/stock/candidates.json
"""
from __future__ import annotations

import glob
import html
import io
import json
import re
import sys
import time
import urllib.parse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

sys.path.insert(0, str(Path(__file__).parent))
from select_minkang import BASE, fetch  # noqa: E402

HERE = Path(__file__).parent
STOCK = HERE / "work" / "stock"
SKIP = re.compile(r"kid|child|baby|wom[ae]n|lad(y|ies)|long|goal\s*keeper|\bgk\b|windbreaker|jacket|shorts|"
                  r"training|hoodie|polo|vest|track|suit|socks|cap\b|bag", re.I)

# stock photo number -> search queries (best guess of what the shirt is)
ITEMS: dict[int, list[str]] = {
    1: ["Liverpool 2006", "Liverpool 2007", "Liverpool 2008", "Liverpool retro"],
    2: ["Spain 2025", "Spain 2026", "Spain special", "Spain Originals"],
    3: ["Argentina 1986"],
    4: ["Germany 1990"],
    5: ["Italy 1994"],
    7: ["Italy 1990", "Italy 1992"],
    8: ["Morocco 2026"],
    9: ["Brazil 1998"],
    10: ["Morocco 1998"],
    11: ["France 2006"],
    12: ["Argentina 2006"],
    14: ["Palmeiras 25/26", "Palmeiras 2025", "Palmeiras 26/27"],
    15: ["Celtic retro", "Celtic 1997", "Celtic 1998", "Celtic 1996"],
    16: ["Al Nassr 25/26", "Al-Nassr 25/26", "Al Nassr"],
    17: ["Celtic 25/26", "Celtic 26/27"],
    18: ["Dortmund 2012", "Dortmund 2013", "Dortmund retro", "Dortmund 12/13"],
    20: ["Netherlands 1988", "Holland 1988"],
    21: ["Boca 2000", "Boca 2001", "Boca 2002", "Boca retro"],
    22: ["Japan special", "Japan anime", "Japan concept"],
    23: ["Brazil 2002"],
    24: ["Newell", "Newells 1993"],
    27: ["PSG 2001", "PSG 2000", "PSG 2002", "PSG retro", "Paris retro"],
    28: ["PSG 25/26", "PSG 26/27"],
    30: ["Portugal special", "Portugal 2025", "Portugal concept"],
    31: ["Boca 25/26", "Boca 26/27", "Boca Juniors 25/26"],
    32: ["Barcelona Coldplay", "Barcelona 24/25 special", "Barcelona 24/25"],
    33: ["Barcelona 24/25"],
    34: ["Barcelona 23/24"],
    35: ["PSG special", "PSG Dior", "PSG concept", "Paris special"],
    36: ["Barcelona 2015", "Barcelona 14/15"],
    37: ["Barcelona 25/26"],
    38: ["Barcelona 2006", "Barcelona 06/07", "Barcelona 2007"],
    39: ["Barcelona 1999", "Barcelona 99/00", "Barcelona 99"],
    40: ["Barcelona special", "Barcelona concept", "Barcelona 25/26 special"],
    41: ["Barcelona special", "Barcelona concept", "Barcelona 25/26"],
    43: ["Barcelona 2013", "Barcelona 13/14", "Barcelona black"],
    44: ["Argentina special", "Argentina concept", "Adidas special"],
}


def search(q: str) -> list[dict]:
    h = fetch(f"{BASE}/search/album?uid=1&sort=&q={urllib.parse.quote_plus(q)}")
    rx = re.compile(r'class="album__main"\s+title="([^"]+)"\s+(?:data-)?href="/albums/(\d+)[^"]*"[\s\S]{0,400}?'
                    r'src="([^"]+/(?:medium|small)\.jpg)"[\s\S]{0,400}?album__photonumber">(\d+)<')
    return [{"title": html.unescape(t).strip(), "album": a, "cover": c.replace("/small.jpg", "/medium.jpg"), "photos": int(n)}
            for t, a, c, n in rx.findall(h)]


def stock_photo(n: int) -> Image.Image:
    p = sorted(glob.glob(str(STOCK / "*.jpeg")))[n - 1]
    return ImageOps.exif_transpose(Image.open(p)).convert("RGB")


def strip(n: int, cands: list[dict], T: int = 260) -> None:
    k = min(len(cands), 11)
    s = Image.new("RGB", (T * (k + 1), T + 46), "white")
    d = ImageDraw.Draw(s)
    im = stock_photo(n)
    im.thumbnail((T, T))
    s.paste(im, ((T - im.width) // 2, 0))
    d.text((4, T + 4), f"STOCK {n:02d}", fill="red")
    for i, c in enumerate(cands[:k]):
        try:
            cov = Image.open(io.BytesIO(fetch(c["cover"], binary=True))).convert("RGB")
            cov.thumbnail((T - 4, T - 4))
            s.paste(cov, (T * (i + 1), 0))
        except Exception:
            pass
        d.text((T * (i + 1) + 2, T + 2), f"{i + 1}) {c['album']} [{c['photos']}]", fill="black")
        d.text((T * (i + 1) + 2, T + 16), c["title"][:34], fill="black")
        d.text((T * (i + 1) + 2, T + 30), c["title"][34:68], fill="black")
    s.save(STOCK / f"match_{n:02d}.jpg", quality=85)


def main(only: list[int]) -> None:
    out_path = STOCK / "candidates.json"
    allc = json.loads(out_path.read_text("utf8")) if out_path.exists() else {}
    for n, queries in ITEMS.items():
        if only and n not in only:
            continue
        seen, cands = set(), []
        for q in queries:
            for c in search(q):
                if c["album"] in seen or SKIP.search(c["title"]) or c["photos"] < 2:
                    continue
                if not all(w.lower() in c["title"].lower() for w in q.split() if w[0].isdigit()):
                    continue  # years in the query must appear in the title
                seen.add(c["album"])
                cands.append(c)
            time.sleep(0.5)
        allc[str(n)] = cands
        strip(n, cands)
        print(f"{n:02d}: {len(cands)} candidates for {queries}", flush=True)
    out_path.write_text(json.dumps(allc, indent=1, ensure_ascii=False), "utf8")


if __name__ == "__main__":
    main([int(a) for a in sys.argv[1:]])
