"""
Stage 1 — pick which Yupoo albums become products.

For each known club: read its Wanfing category page, keep only current-season
(2026/27) men's Home / Away / Third shirts in the PLAYER version (fan versions
are skipped), pick one album per kit, then collect the album's photo URLs.
Writes work/manifest.json for review before anything is processed.
"""
from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

BASE = "https://wanfing.x.yupoo.com"
HDR = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36",
       "Referer": BASE + "/"}

# DB team slug -> Wanfing category id (verified by name on the Wanfing nav)
CLUBS = {
    "real-madrid": "815924", "fc-barcelona": "815925", "atletico-madrid": "815926",
    "manchester-united": "814530", "manchester-city": "814537", "liverpool": "815883",
    "arsenal": "814536", "chelsea": "814539", "tottenham": "814540",
    "bayern-munich": "816914", "borussia-dortmund": "816921",
    "juventus": "816801", "inter-milan": "816779", "ac-milan": "816786",
    "napoli": "816793", "as-roma": "816802",
    "paris-saint-germain": "816949", "olympique-marseille": "816964",
}

SEASON = re.compile(r"\b(2026\s*/\s*27|26\s*/\s*27|2026-27|26-27)")
# anything that is not a men's match shirt
EXCLUDE = re.compile(
    r"kid|child|youth|baby|women|woman|ladies|girl|retro|long[- ]?sleeve|"
    r"train|vest|polo|jacket|track|hoodie|coat|short|sock|keychain|key chain|"
    r"scarf|hat|cap|goalkeeper|\bgk\b|pre[- ]?match|warm[- ]?up|set\b|suit",
    re.I)
MIN_PHOTOS = 5
# Owner wants PLAYER versions only (slimmer authentic cut, heat-pressed badges),
# never the regular fan version. Titles vary: "Player version", "Player Edition",
# "2026/27Player Version"...
PLAYER = re.compile(r"player\s*(version|edition)", re.I)


def fetch(url: str) -> str:
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=HDR)
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
        except Exception:
            time.sleep(1 + attempt)
    return ""


def kit_of(title: str) -> str | None:
    t = title.lower()
    if re.search(r"\biiii\b|fourth|4th", t):
        return "fourth"
    if re.search(r"\biii\b|third|3rd", t):
        return "third"
    if re.search(r"\bii\b|away|2nd", t):
        return "away"
    if re.search(r"\bhome\b|\bi\b", t):
        return "home"
    return None


def album_cards(cat_html: str) -> list[dict]:
    rx = re.compile(r'class="album__main"\s+title="([^"]+)"\s+href="/albums/(\d+)[^"]*"'
                    r'[\s\S]{0,500}?album__photonumber">(\d+)<')
    return [{"title": html.unescape(t).strip(), "album": a, "photos": int(n)}
            for t, a, n in rx.findall(cat_html)]


def album_photos(album_id: str) -> list[str]:
    """Photo URLs in album order, one per photo (prefer the 'big' rendition)."""
    h = fetch(f"{BASE}/albums/{album_id}?uid=1")
    urls = re.findall(r'(?:https:)?//photo\.yupoo\.com/wanfing/([a-z0-9]+)/([a-z0-9]+)\.(jpg|jpeg|png|webp)', h)
    order, best = [], {}
    for folder, name, ext in urls:
        if name in ("small", "medium", "square", "thumb"):
            continue
        if folder not in best:
            order.append(folder)
        if folder not in best or name == "big":
            best[folder] = f"https://photo.yupoo.com/wanfing/{folder}/{name}.{ext}"
    return [best[f] for f in order]


def choose(cands: list[dict]) -> dict:
    """Same player kit listed more than once: prefer an album with enough photos,
    then the NEWEST listing (highest album id = final release design)."""
    return max(cands, key=lambda c: (c["photos"] >= 8, int(c["album"])))


def main(out_path: str, only: list[str]) -> None:
    manifest = []
    for slug, cat in CLUBS.items():
        if only and slug not in only:
            continue
        cards = album_cards(fetch(f"{BASE}/categories/{cat}?isSubCate=true"))
        by_kit: dict[str, list[dict]] = {}
        for c in cards:
            if not SEASON.search(c["title"]) or EXCLUDE.search(c["title"]):
                continue
            if not PLAYER.search(c["title"]):
                continue  # fan version — skip
            if c["photos"] < MIN_PHOTOS:
                continue
            k = kit_of(c["title"])
            if k in ("home", "away", "third"):
                by_kit.setdefault(k, []).append(c)
        for kit in ("home", "away", "third"):
            if kit not in by_kit:
                print(f"  {slug:22} {kit:6} — none found")
                continue
            pick = choose(by_kit[kit])
            pick["photo_urls"] = album_photos(pick["album"])
            manifest.append({"team": slug, "kit": kit, **pick,
                             "alternatives": [c["title"] for c in by_kit[kit] if c is not pick]})
            print(f"  {slug:22} {kit:6} {pick['album']}  {len(pick['photo_urls']):2} photos  {pick['title']}")
            time.sleep(0.3)  # be polite to Yupoo
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n{len(manifest)} products -> {out_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "work/manifest.json", sys.argv[2:])
