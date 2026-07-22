/**
 * Helpers to parse + clean a product's `images` JSON column for display.
 *
 * The Yupoo scrapers (xingkong-sports, wanfing) emit TWO URLs per photo:
 *   /api/img/<src>/<photo-hash>/big.jpg     (high-res "big" version)
 *   /api/img/<src>/<photo-hash>/<file>.jpg  (original-name version)
 * Both point to the same image, just different filenames in the same Yupoo
 * "photo folder". Without de-duping, each gallery shows every shot twice.
 *
 * We collapse those pairs to a single URL per photo hash (preferring
 * `big.jpg` for consistent sizing), preserving the upload order. The first
 * surviving photo — i.e. whatever the seller uploaded as the cover/front
 * shot — therefore stays at index 0, which is what catalogue cards render.
 */

/** Extract the Yupoo photo-folder hash from `/api/img/<src>/<hash>/<file>` paths. */
function yupooHash(url: string): string | null {
  const m = url.match(/\/api\/img\/[^/]+\/([^/]+)\//);
  return m ? m[1] : null;
}

/** Dedupe an already-parsed image URL list. Stable + idempotent. */
export function dedupeProductImages(imgs: string[]): string[] {
  if (!Array.isArray(imgs) || imgs.length < 2) return imgs || [];

  // First pass: collect URLs per Yupoo hash so we can prefer the big.jpg variant.
  const byHash = new Map<string, string[]>();
  for (const url of imgs) {
    const h = yupooHash(url);
    if (h) {
      const arr = byHash.get(h);
      if (arr) arr.push(url);
      else byHash.set(h, [url]);
    }
  }

  const seenHash = new Set<string>();
  const seenUrl = new Set<string>();
  const kept: string[] = [];

  for (const url of imgs) {
    const h = yupooHash(url);
    if (h) {
      if (seenHash.has(h)) continue;
      seenHash.add(h);
      const variants = byHash.get(h)!;
      const big = variants.find((u) => /\/big\.jpg(\?|$)/i.test(u));
      kept.push(big || variants[0]);
    } else {
      if (seenUrl.has(url)) continue;
      seenUrl.add(url);
      kept.push(url);
    }
  }
  return kept;
}

/** Parse the raw JSON `images` column and return a clean, deduped URL list. */
export function parseProductImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return dedupeProductImages(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

/** First (front-facing) image, or empty string if none. */
export function firstProductImage(raw: string | null | undefined): string {
  const list = parseProductImages(raw);
  return list[0] || "";
}

/**
 * Display sources for a product's images. Base64 data URLs are swapped for a
 * cached image route (`/api/pi/<id>/<index>`) so they are NOT inlined into the
 * page HTML — this is the single biggest bandwidth win, since the same photo
 * would otherwise be re-shipped as base64 on every page it appears on. Remote
 * URLs (Yupoo proxy, flag CDNs, etc.) are returned untouched.
 */
export function productImageSrcs(id: string, raw: string | null | undefined): string[] {
  return parseProductImages(raw).map((src, i) =>
    src.startsWith("data:") ? `/api/pi/${id}/${i}` : src
  );
}

/** First display source for a product (cached route for base64, else the URL). */
export function firstProductImageSrc(id: string, raw: string | null | undefined): string {
  return productImageSrcs(id, raw)[0] || "";
}
