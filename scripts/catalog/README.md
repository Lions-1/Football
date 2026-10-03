# Catalog pipeline — Yupoo (Wanfing) → mebutiksports

Turns supplier albums into site products: player-version kits only, background
removed on the GPU, white studio backdrop, mebutiksports watermark, 800×800 WebP.

Images are **static files in `public/catalog/`** (served by the CDN) and the DB
row only stores their paths — never base64, never in the database (that is what
made the old setup expensive).

## Run (from `scripts/catalog/`)

```
.venv\Scripts\python select_albums.py work/manifest.json real-madrid fc-barcelona   # 1. pick albums (omit clubs = all)
.venv\Scripts\python run_batch.py                                                  # 2. download + process -> work/review_white.jpg
```
Check `work/review_white.jpg`, then from the repo root:
```
node scripts/catalog/publish.mjs --phase files --apply   # 3a. copy images into public/catalog/
git add public/catalog && git commit && git push          #     wait for the deploy to be live
node scripts/catalog/publish.mjs --phase db --apply      # 3b. create the products (skips existing slugs)
```

### Re-publishing products that are already live (zero downtime)
```
node scripts/catalog/publish.mjs --phase files --keep-old --apply   # new files next to the old ones
git add public/catalog && git commit && git push                     # wait until live
node scripts/catalog/publish.mjs --phase db --apply                  # products now point at the new files
node scripts/catalog/publish.mjs --phase prune --apply               # delete files nothing references
git add -A public/catalog && git commit && git push
```

## Rules baked in
- `select_albums.py`: 2026/27, men's, Home/Away/Third, **Player version only**,
  newest album when a kit is listed twice. Club → Wanfing category ids in `CLUBS`.
- `select_albums.py` downloads each photo's ORIGINAL upload (~1254px), not
  Yupoo's resized 'big' copy (1080px). Output is WebP quality 90 + a light
  unsharp mask (`WEBP_QUALITY` / `SHARPEN` in process.py).
- `process.py`: BiRefNet (MIT) via rembg on CUDA (~1 s/photo). Full-shot vs
  close-up classifier calibrated with `_features.py`; care labels skipped.
  Full shots are cut out onto the soft grey backdrop (`grey` variant, no
  watermark since 2026-10); close-ups (pure fabric, nothing to cut out) are
  shown as a rounded, shadowed photo card on the same backdrop.
- `publish.mjs`: 280 MAD, sizes S–XXL, "Available" (add `--pre-order` to change),
  name `<Team> 26-27 <Kit> Player Version`, description in the owner's style.

## Minkang (current source, since 2026-10-03)
The owner's client chose Minkang's own studio look (dark wall, mannequin).
```
.venv\Scripts\python select_minkang.py            # 1. pick albums + download originals (all clubs, or name some)
.venv\Scripts\python run_minkang.py               # 2. photo roles + stamp removal -> work/results.json + review_*.jpg
#   look at work/minkang/review_*.jpg; fix a bad pick with PICKS in run_minkang.py
node publish.mjs --phase files --keep-old --apply  # 3. then commit + push, wait for the deploy
node publish.mjs --phase db --apply                # 4. create new / refresh existing products
node publish.mjs --phase retire                    # 5. (dry run) products no longer in results.json; add --apply to delete (backup written)
node publish.mjs --phase prune --apply             # 6. later (>15 min, cached pages): drop unused images, commit + push
```
- `select_minkang.py`: `CLUBS` = DB team slug -> Minkang category (they use
  "LFC", "M-U", "Juv"...). 26/27, player version, men's short sleeve,
  Home/Away/Third, most photos then newest. `ALBUM_OVERRIDES` fixes albums
  Minkang mislabels (M-U & Chelsea "Third" that are really the away).
  Liverpool and Juventus albums are password-protected ("加密相册") — ask
  Minkang for the password. Kits with only front+back photos are kept.
- `run_minkang.py`: FULL shots (mostly studio wall, centred subject) are used
  exactly as shot — no stamp on them. CLOSE-ups (no wall, cut-out not touching
  the top) get the stamp inverted out and are ranked by logo size (crest /
  sponsor first). Odd-sized uploads are skipped as close-ups.
- `dewatermark.py fit work/minkang/src work/minkang/fit` re-measures the stamp
  (per-pixel opacity, ~260 photos); `remove()` inverts it at JPEG resolution
  (brightness full-res, colour half-res), fills leftover traces on flat
  surfaces. `CALIBRATE` stays False (tested worse on bright fabric).
- Season label: clubs `26-27` (2026/27), national teams `2026` (`NATIONAL`).
