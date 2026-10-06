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
    # second batch (2026-10-06 photos, work/stock2)
    ("ajax", "26-27", "third", "252314327", "Adidas", False, ["b01"]),
    ("inter-miami", "26-27", "third", "253306717", "Adidas", False, ["b10"]),
    # third batch (2026-10-06 21:15 photos, work/stock3) - retros
    ("manchester-united", "93-95", "away", "83349922", "Umbro", True, ["c01"]),
    ("manchester-united", "1991", "away", "212322826", "Adidas", True, ["c02"]),
    ("manchester-united", "99-00", "away", "212382043", "Umbro", True, ["c03"]),
    ("manchester-united", "92-93", "away", "82311450", "Umbro", True, ["c06"]),
    ("manchester-united", "94-96", "third", "212322292", "Umbro", True, ["c07"]),
    ("manchester-united", "95-96", "away", "84984222", "Umbro", True, ["c11"]),
    ("manchester-united", "96-98", "third", "212580071", "Umbro", True, ["c15", "c16"]),
    ("lazio", "99-00", "home", "75825936", "Puma", True, ["c08"]),
    ("as-roma", "17-18", "home", "212928089", "Nike", True, ["c21"]),
    ("arsenal", "95-96", "away", "91947696", "Nike", True, ["c09", "c24", "c25", "c26"]),
    ("arsenal", "90-92", "home", "89660952", "Adidas", True, ["c10"]),
    ("arsenal", "93-94", "away", "166609746", "Adidas", True, ["c12"]),
    ("arsenal", "88-89", "home", "84985244", "Adidas", True, ["c13"]),
    ("arsenal", "02-04", "away", "113916071", "Nike", True, ["c14"]),
    ("arsenal", "91-93", "away", "82216237", "Adidas", True, ["c19"]),
    ("arsenal", "02-04", "home", "83140560", "Nike", True, ["c27", "c35"]),
    ("arsenal", "05-06", "home", "82258615", "Nike", True, ["c29", "c30"]),
    ("arsenal", "92-93", "home", "84467338", "Adidas", True, ["c31", "c32"]),
    ("arsenal", "99-00", "away", "84286064", "Nike", True, ["c33", "c34"]),
    ("boca-juniors", "96-97", "home", "130120912", "Nike", True, ["c17", "c18"]),
    # found on a second pass (2026-10-07)
    ("fc-barcelona", "26-27", "special", "226515335", "Nike", False, [41]),
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
