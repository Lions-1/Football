"""Dump classifier features for every source photo of some products (calibration)."""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw
from rembg import remove
import process

slugs = sys.argv[1:]
W = 150
rows = []
for slug in slugs:
    for p in sorted(glob.glob(f"work/src/{slug}/*")):
        src = Image.open(p).convert("RGB")
        src.thumbnail((1600, 1600))
        cut = remove(src, session=process._rembg_session())
        a = np.array(cut.getchannel("A")) > 128
        H, Wd = a.shape
        kind, _ = process.classify(cut, src)
        ys = np.where(a.any(axis=1))[0]
        if len(ys) == 0:
            feats = "empty"
        else:
            y0, y1 = ys.min(), ys.max()
            bh = (y1 - y0 + 1) / H
            widths = np.array([(np.ptp(np.where(r)[0]) + 1) if r.any() else 0 for r in a[y0:y1 + 1]])
            n = len(widths)
            top = widths[: int(n * 0.6)]
            rmax = int(np.argmax(top)); wmax = top[rmax]
            win = widths[rmax: rmax + max(3, int(n * 0.18))]
            drop = win.min() / wmax if wmax else 1
            gmax = widths.max()
            neck = widths[: max(1, int(n * 0.06))].mean() / gmax if gmax else 1
            extent = a.sum() / ((y1 - y0 + 1) * gmax) if gmax else 1
            hsv = np.array(src.convert("HSV")); bg = ~a
            sat = hsv[..., 1][bg].mean() / 255 if bg.any() else 0
            feats = f"cov {a.mean():.2f} bh {bh:.2f} drop {drop:.2f} neck {neck:.2f} ext {extent:.2f} sat {sat:.2f} -> {kind}"
        th = Image.new("RGBA", cut.size, (110, 110, 110, 255)); th.alpha_composite(cut)
        th = th.convert("RGB"); th.thumbnail((W - 4, W - 4))
        rows.append((f"{slug[:22]} {os.path.basename(p)}", feats, th))
        print(slug, os.path.basename(p), feats, flush=True)

cols = 6
sheet = Image.new("RGB", (cols * W, ((len(rows) + cols - 1) // cols) * (W + 30)), "white")
d = ImageDraw.Draw(sheet)
for i, (name, feats, th) in enumerate(rows):
    x, y = (i % cols) * W, (i // cols) * (W + 30)
    sheet.paste(th, (x + 2, y + 2))
    d.text((x + 2, y + W - 2), name[-24:], fill="black")
    d.text((x + 2, y + W + 12), feats.replace("cov ", "").replace(" -> ", " "), fill="red")
sheet.save("work/features.jpg", quality=80)
