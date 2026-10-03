"""Stage 1 (Minkang) — pick one album per club+kit on minkang.x.yupoo.com and
download its ORIGINAL photos (1000px).

Rules (owner, 2026-10-03): 2026/27, men's short-sleeve, Home/Away/Third,
PLAYER version only; one album per kit (most photos, then newest).
Output: work/minkang/manifest.json + work/minkang/src/<slug>/NN.jpg

  .venv\\Scripts\\python select_minkang.py            # all clubs
  .venv\\Scripts\\python select_minkang.py napoli roma # some clubs
"""
from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

BASE = "https://minkang.x.yupoo.com"
HDR = {"User-Agent": "Mozilla/5.0", "Referer": BASE + "/"}
HERE = Path(__file__).parent
WORK = HERE / "work" / "minkang"

# DB team slug -> Minkang category id (club names there: LFC, M-U, Juv...)
CLUBS = {
    "real-madrid": 718622, "fc-barcelona": 718623, "atletico-madrid": 718624,
    "manchester-united": 720294, "manchester-city": 720295, "liverpool": 720293,
    "arsenal": 720297, "chelsea": 720296, "tottenham": 720298,
    "aston-villa": 720301, "crystal-palace": 720305,
    "inter-milan": 724783, "ac-milan": 724784, "juventus": 724785,
    "napoli": 724791, "as-roma": 724793,
    "bayern-munich": 724824, "borussia-dortmund": 724825,
    "paris-saint-germain": 724798, "olympique-marseille": 724800,
}
# Albums Minkang mislabels (checked by eye 2026-10-03 against their fan
# versions and Wanfing): team -> {kit: album id}
ALBUM_OVERRIDES = {
    "manchester-united": {"away": "248835623", "third": "251101856"},  # blue "Third" is the away
    "chelsea": {"away": "242208256", "third": "252350903"},            # black "Third Away" is the away
}
# national teams: (team slug, category, title must match, kits, season label)
NATIONAL = [("morocco", 5062328, r"\bmorocco\b", ("away",), "2026")]

SEASON = re.compile(r"(?<!\d)(20)?26\s*[/-]\s*(20)?27(?!\d)")
PLAYER = re.compile(r"player\s*(version|edition)", re.I)
EXCLUDE = re.compile(
    r"long[\s-]*sleeve|\bls\b|wom[ae]n|lad(y|ies)|female|kid|child|youth|baby|infant|"
    r"goal\s*keeper|\bgk\b|special|fourth|4th|training|pre[\s-]*match|warm[\s-]*up|retro|"
    r"concept|anniversary|commemorative|polo|jacket|windbreaker|hoodie|vest|track|shorts|"
    r"\bx\b|collab|fan\s*version", re.I)
MIN_PHOTOS = 2   # newest kits often have only front+back so far (owner wants all 3 kits)


def fetch(url: str, binary: bool = False):
    for attempt in range(5):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=60).read()
            return data if binary else data.decode("utf-8", "ignore")
        except Exception:
            time.sleep(2 + 3 * attempt)
    return b"" if binary else ""


def kit_of(title: str) -> str | None:
    t = title.lower()
    if re.search(r"third|3rd|\biii\b", t):
        return "third"
    if re.search(r"away|2nd|\bii\b", t):
        return "away"
    if re.search(r"home|\bi\b", t):
        return "home"
    return None


def album_cards(cat: int) -> list[dict]:
    rx = re.compile(r'class="album__main"\s+title="([^"]+)"\s+href="/albums/(\d+)[^"]*"'
                    r'[\s\S]{0,500}?album__photonumber">(\d+)<')
    # sub-categories list with ?isSubCate=true, top-level ones without it
    for flag in ("isSubCate=true&", ""):
        seen, out = set(), []
        for page in range(1, 60):
            cards = [c for c in rx.findall(fetch(f"{BASE}/categories/{cat}?{flag}page={page}")) if c[1] not in seen]
            if not cards:
                break
            for t, a, n in cards:
                seen.add(a)
                out.append({"title": html.unescape(t).strip(), "album": a, "photos": int(n)})
            time.sleep(0.4)
        if out:
            return out
    return []


def album_photos(album: str) -> list[str]:
    """ORIGINAL upload URLs, in album order."""
    h = fetch(f"{BASE}/albums/{album}?uid=1")
    orig = {}
    for user, folder, name, ext in re.findall(
            r'(?:https:)?//photo\.yupoo\.com/([a-z0-9]+)/([a-z0-9]+)/([a-z0-9]+)\.(jpg|jpeg|png|webp)', h):
        if name not in ("small", "medium", "square", "thumb", "big"):
            orig.setdefault(folder, f"https://photo.yupoo.com/{user}/{folder}/{name}.{ext}")
    return list(orig.values())


def pick(cards: list[dict], kits, season_rx, title_rx=None) -> dict[str, dict]:
    best: dict[str, dict] = {}
    for c in cards:
        t = c["title"]
        if not (season_rx.search(t) and PLAYER.search(t)) or EXCLUDE.search(t):
            continue
        if title_rx and not re.search(title_rx, t, re.I):
            continue
        kit = kit_of(t)
        if kit not in kits:
            continue
        cur = best.get(kit)
        if cur is None or (c["photos"], int(c["album"])) > (cur["photos"], int(cur["album"])):
            best[kit] = c
    return best


def main(only: list[str]) -> None:
    man_path = WORK / "manifest.json"
    manifest = {m["slug"]: m for m in json.loads(man_path.read_text("utf8"))} if man_path.exists() else {}
    jobs = [(slug, cat, None, ("home", "away", "third"), "26-27") for slug, cat in CLUBS.items()]
    jobs += [(slug, cat, rx, kits, label) for slug, cat, rx, kits, label in NATIONAL]
    for team, cat, title_rx, kits, label in jobs:
        if only and team not in only:
            continue
        season_rx = SEASON if label == "26-27" else re.compile(rf"(?<!\d){label}(?!\d)(?!\s*[/-]\s*\d)")
        cards = album_cards(cat)
        best = pick(cards, kits, season_rx, title_rx)
        for kit, album in ALBUM_OVERRIDES.get(team, {}).items():
            best[kit] = next(c for c in cards if c["album"] == album)
        for kit in kits:
            c = best.get(kit)
            if not c:
                print(f"  - {team} {kit}: no {label} player version")
                continue
            slug = f"{team}-{label}-{kit}"
            urls = album_photos(c["album"])
            if len(urls) < MIN_PHOTOS:
                print(f"  - {team} {kit}: album {c['album']} has only {len(urls)} photos — skipped")
                continue
            d = WORK / "src" / slug
            if slug in manifest and manifest[slug]["album"] != c["album"] and d.exists():
                import shutil
                shutil.rmtree(d)  # a different album won: don't mix photos
            d.mkdir(parents=True, exist_ok=True)
            for i, u in enumerate(urls):
                f = d / f"{i + 1:02d}.{u.rsplit('.', 1)[1]}"
                if not f.exists():
                    f.write_bytes(fetch(u, binary=True))
                    time.sleep(0.25)
            manifest[slug] = {"slug": slug, "team": team, "kit": kit, "season": label, "album": c["album"],
                              "title": c["title"], "photos": len(urls)}
            print(f"  + {slug:34s} {len(urls):2d} photos  {c['title']}")
        man_path.write_text(json.dumps(list(manifest.values()), indent=1), "utf8")


if __name__ == "__main__":
    main(sys.argv[1:])
