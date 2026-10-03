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

## Minkang trial (minkang.x.yupoo.com, 2026-10-03)
Pro studio shoot (mannequin, macro close-ups), 1000px originals. Currently
used for Real Madrid home/away and Barcelona home/away/third, for the owner's
client to compare against Wanfing.
- Their close-ups carry a fixed "minkang.x.yupoo.com" text stamp (front/back
  shots don't). `dewatermark.py fit work/minkang/src work/minkang/fit` measures
  it (per-pixel opacity from ~90 photos) and `remove()` inverts it — brightness
  at full res, colour at JPEG's half res, strength self-calibrated locally,
  flat surfaces/leftover traces filled from neighbours. The real fabric under
  the letters comes back; nothing is invented.
- `run_minkang.py`: hand-picked photos per product (`PICKS`): front/back
  cut-outs (stand pole trimmed) + 3 full-bleed close-ups (crest, sponsor,
  brand). Rewrites those slugs in `work/results.json` (Wanfing version kept in
  `work/results_wanfing.json` — copy it back + re-publish to revert).
- Real Madrid third stays on Wanfing (Minkang album has only 2 photos).
- Use of the supplier's photos without their stamp: confirm with Minkang.
