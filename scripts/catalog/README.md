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

## Rules baked in
- `select_albums.py`: 2026/27, men's, Home/Away/Third, **Player version only**,
  newest album when a kit is listed twice. Club → Wanfing category ids in `CLUBS`.
- `process.py`: BiRefNet (MIT) via rembg on CUDA (~1 s/photo). Full-shot vs
  close-up classifier calibrated with `_features.py`; care tags skipped.
- `publish.mjs`: 280 MAD, sizes S–XXL, "Available" (add `--pre-order` to change),
  name `<Team> 26-27 <Kit> Player Version`, description in the owner's style.
