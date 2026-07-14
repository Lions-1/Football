# Spec — Promo Offer Widget + Admin-Managed Reviews

Two independent features for mebutiksports.com. Aligned with the owner on
2026-07-14. Implement against the existing patterns in this codebase (Next.js
App Router, Prisma/Neon, zustand cart in `src/lib/store.ts`, WhatsApp-only
ordering — there is NO checkout).

WhatsApp order number: `212628552405` (see `src/app/cart/page.tsx`).

---

## Feature 1 — Tiered promo widget ("Offre à débloquer")

### Business rule (tiers by ITEM COUNT, not amount)

All products are effectively the same price, so tiers count items
(sum of quantities in the cart, `cart.count()`):

| Cart items | Tier unlocked | Effect |
|---|---|---|
| 0–1 | none (locked) | show progress toward tier 1 |
| 2 | Tier 1: "3rd at −50%" | the NEXT item added (3rd) gets 50% off |
| 3 | Tier 1 active | one item in cart is discounted 50% |
| 4+ | Tier 2: "4th FREE" | one item becomes FREE; **replaces** the 50% tier |

Rules:
- **Tiers upgrade, they do not stack.** With 3 items: cheapest item −50%
  (pay 2.5×). With 4 items: cheapest item free, no 50% anywhere (pay 3×).
  <!-- Owner default; if stacking is wanted later it's a one-line change. -->
- Discount always applies to the **cheapest item** in the cart (safe if
  prices ever differ).
- **Once per order** in v1 (8 items ≠ 2 free). Keep the tier computation in
  one pure function so "repeat every 4" is easy to enable later.
- If items are removed and the cart drops below a threshold, the benefit
  **auto-downgrades/removes** (pure derived state — never stored).
- The discount is **derived at render/message time** from cart contents.
  Do NOT store discounted prices in the cart items themselves.

### UX (inspired by the reference screenshots, not a copy)

Modal/popup widget, shown **when the user adds an item to cart**
(`handleAddToCart` in `src/components/ProductDetail.tsx`), plus a compact
version of the same progress UI embedded on the `/cart` page above the total.

Three visual states:
1. **Locked** (0–1 items): "🔒 Offre à débloquer — Tchri 2, le 3ème à −50%"
   + progress `X / 2 articles` + next tier teaser ("3 achetés = 4ème
   GRATUIT") + button "Continuer mes achats" (closes modal).
2. **Tier 1 unlocked** (2–3 items): celebrate small; show "3ème article à
   −50% ✓" and progress toward tier 2: "Ajoutez N article(s) pour le 4ème
   GRATUIT" (`X / 4 articles`).
3. **Tier 2 unlocked** (4+ items): "✓ Offre débloquée — Félicitations 🎉",
   the free item shown with `0 MAD` and struck-through original price,
   button "Finaliser ma commande →" linking to `/cart`.

Style: match the site (orange-500 accents, rounded-2xl, font-heading) —
light theme, not the dark theme of the reference screenshots. Mobile-first;
the modal must be dismissible (X + backdrop click) and never block browsing.

### Cart page + WhatsApp message

On `/cart`:
- Show the discounted line visually: original price struck through, new
  price (or GRATUIT) highlighted, e.g. `429 MAD → 214 MAD (−50%)`.
- Totals block shows: Subtotal, Réduction (−X MAD), Total.
- The compact progress widget above the total nudges the next tier
  ("Ajoutez 1 article → le 4ème GRATUIT").

The WhatsApp message (`buildWhatsAppLink()` in `src/app/cart/page.tsx`) MUST
spell out the promo so the owner can honor it manually:

```
• Maillot A (x1) — 329 MAD
• Maillot B (x1) — 329 MAD
• Maillot C (x1) — 329 MAD
• Maillot D (x1) — GRATUIT (offre 3+1) ~~329 MAD~~

Sous-total: 1316 MAD
Réduction (4ème gratuit): −329 MAD
*Total: 987 MAD*
```

(For tier 1: `— −50% (offre 3ème à moitié prix)` and the reduction line.)

### Implementation notes

- Pure helper, e.g. `src/lib/promo.ts`: `computePromo(items) →
  { tier: 0|1|2, discountedItemKey, discountAmount, subtotal, total,
    itemsToNextTier }`. Unit-testable, single source of truth used by the
  modal, the cart page, and the WhatsApp message builder.
- Widget component, e.g. `src/components/PromoModal.tsx` (client), driven
  by `useCartStore`. Trigger: after `cart.addItem` succeeds in
  `ProductDetail`. Consider a tiny zustand flag or callback rather than
  global event hacks.
- Do not create DB models for this — it is entirely client-side derived
  state + message formatting.
- French copy as shown (site audience is Moroccan; existing UI mixes FR/EN
  — keep promo copy in French like the reference).

---

## Feature 2 — Admin-managed customer reviews (photo wall)

### Behavior

- **Photo-only** reviews: owner uploads screenshots/photos of customer
  feedback. No names, text, or ratings in v1.
- **Public display:** a photo **grid** section at the END of the homepage
  (`src/app/page.tsx`, after the last section). If there are **0 reviews,
  render nothing at all** (component returns `null` — no header, no empty
  state).
- Tapping a photo opens it larger (simple lightbox/dialog; no library
  needed — a fixed overlay with the image is fine).
- Homepage is ISR (`revalidate = 60`) — new reviews appear within a minute.
  Keep it that way; do NOT make the homepage dynamic for this.

### Admin panel

New **"Reviews"** tab in `src/components/admin/AdminDashboard.tsx`
(follow the existing `Tab` union + tab button pattern):
- Multi-image upload (reuse the existing upload flow + client-side
  compression used by `ProductForm`).
- Grid list of current review photos, each with a delete button
  (confirm before delete).
- **Live preview**: render the SAME public section component inside the
  admin tab, fed with the current list — the preview is by construction
  identical to what the homepage shows.

### Data + storage

- Prisma model:

```prisma
model Review {
  id        String   @id @default(cuid())
  image     String   // URL (Blob) or data URL (fallback)
  order     Int      @default(0)
  createdAt DateTime @default(now())
}
```

  Schema is managed with `prisma db push` (no migrations dir).

- API: `src/app/api/admin/reviews/route.ts` (GET list / POST create /
  DELETE by id — follow `api/admin/products` conventions incl.
  `requireAdmin`). Public read can be a direct Prisma query in the
  homepage server component (no public API route needed).

- **Storage decision:** prefer **Vercel Blob** (`@vercel/blob` is already
  in package.json).
  ⚠️ The project migrated to a NEW Vercel account on 2026-07-14; the old
  Blob store (`mebutik-images`) belonged to the abandoned account. A Blob
  store must be **created on the new account and connected to the project**
  (dashboard → Storage → Create Blob store) so `BLOB_READ_WRITE_TOKEN` is
  injected. If the owner hasn't done this at implementation time,
  **fall back to the existing base64-data-URL upload flow** (same as
  products) — acceptable because review images are few and the homepage
  is ISR-cached.

### Non-goals (v1)

- No customer-submitted reviews (owner uploads only).
- No text/name/star fields.
- No pagination — cap display at the newest ~24, ordered by `order` then
  `createdAt desc`.

---

## Verification checklist (for the implementing session)

- [ ] `npx tsc --noEmit` clean; `npx eslint` clean on touched files.
- [ ] Promo: add 1→2→3→4 items and verify each widget state, the cart
      strikethrough, and the WhatsApp message text (decode the `wa.me`
      URL and read it).
- [ ] Promo: remove items and verify the benefit downgrades/removes.
- [ ] Reviews: with 0 reviews the homepage shows NO trace of the section.
- [ ] Reviews: upload → appears in admin preview; homepage within 60s.
- [ ] Deploy: push to GitHub master (new Vercel account auto-deploys).
