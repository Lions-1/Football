"""Owner's physical stock (2026-10-04 photos) -> the matching Minkang albums.

Albums were matched by eye (stock photo vs album covers, see stock_match.py).
This downloads them into work/minkang/src/<slug>/ and appends them to
work/minkang/manifest_stock.json, which run_minkang.py then processes like
any other product. Retro shirts get category "retro".

  .venv\\Scripts\\python stock_minkang.py
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from select_minkang import WORK, album_photos, fetch

PRICE_MAD = 350   # owner, 2026-10-05: stock shirts sell at 350
# (team slug, season label, kit, album id, kit maker, retro?, stock photo #s)
STOCK = [
    ("argentina", "1986", "away", "89921632", "Le Coq Sportif", True, [3]),
    ("germany", "1990", "home", "75825658", "Adidas", True, [4]),
    ("italy", "1994", "home", "82070657", "Diadora", True, [5, 7]),
    ("brazil", "1998", "home", "94445533", "Nike", True, [9]),
    ("morocco", "1998", "home", "85483286", "Puma", True, [10]),
    ("france", "2006", "away", "64405123", "Adidas", True, [11]),
    ("argentina", "2006", "away", "113757549", "Adidas", True, [12]),
    ("morocco", "2026", "home", "223119925", "Puma", False, [13]),
    ("celtic", "98-99", "home", "82590717", "Umbro", True, [15]),
    ("borussia-dortmund", "12-13", "home", "89874964", "Puma", True, [18]),
    ("celtic", "25-26", "home", "211960180", "Adidas", False, [19]),
    ("netherlands", "1988", "home", "15247910", "Adidas", True, [20]),
    ("boca-juniors", "99-00", "home", "89418137", "Nike", True, [21]),
    ("brazil", "2002", "away", "83449108", "Nike", True, [23, 29]),
    ("newells-old-boys", "93-94", "home", "89952324", "Adidas", True, [24]),
    ("paris-saint-germain", "02-03", "home", "96144687", "Nike", True, [27]),
    ("paris-saint-germain", "24-25", "home", "212392843", "Nike", False, [28]),
    ("boca-juniors", "1981", "home", "85143777", "Adidas", True, [31]),
    ("fc-barcelona", "14-15", "home", "82311328", "Nike", True, [36]),
    ("fc-barcelona", "25-26", "home", "211958125", "Nike", False, [37]),
    ("fc-barcelona", "07-08", "home", "130120939", "Nike", True, [38]),
    ("fc-barcelona", "13-14", "third", "151321244", "Nike", True, [43]),
]


def season_text(label: str) -> str:
    if "-" in label:
        a, b = label.split("-")
        century = "19" if int(a) >= 50 else "20"
        return f"{century}{a}/{b}"
    return label


def main() -> None:
    out = []
    for team, label, kit, album, brand, retro, stock in STOCK:
        slug = f"{team}-{label}-{kit}" + ("-retro" if retro else "")
        urls = album_photos(album)
        d = WORK / "src" / slug
        d.mkdir(parents=True, exist_ok=True)
        for i, u in enumerate(urls):
            f = d / f"{i + 1:02d}.{u.rsplit('.', 1)[1]}"
            if not f.exists():
                f.write_bytes(fetch(u, binary=True))
                time.sleep(0.25)
        out.append({"slug": slug, "team": team, "kit": kit, "season": label, "album": album,
                    "title": f"stock {stock}", "photos": len(urls), "brand": brand,
                    "category": "retro" if retro else "jersey", "season_text": season_text(label),
                    "player": False, "price": PRICE_MAD})
        print(f"  + {slug:40s} {len(urls):2d} photos", flush=True)
    (WORK / "manifest_stock.json").write_text(json.dumps(out, indent=1), "utf8")


if __name__ == "__main__":
    main()
