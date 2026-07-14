import type { CartItem } from "@/lib/store";

/**
 * Tiered volume promo, by ITEM COUNT (all products are ~same price):
 *   - 3 items  → the 3rd (cheapest) is 50% off
 *   - 4+ items → the 4th (cheapest) is FREE   (replaces the 50% tier)
 *
 * Tiers UPGRADE, they do not stack, and the benefit applies once per order.
 * Everything here is pure/derived from the cart — nothing is stored.
 */
export const PROMO = {
  HALF_AT: 3, // reach 3 items → 50% off one
  FREE_AT: 4, // reach 4 items → one free
} as const;

export interface PromoResult {
  count: number; // total quantity in cart
  tier: 0 | 1 | 2; // 0 = none, 1 = half-off, 2 = free
  subtotal: number; // before discount
  discount: number; // amount reduced (integer MAD)
  total: number; // subtotal - discount
  cheapestUnit: number; // price of the discounted/free unit
  itemsToNext: number; // items still needed to reach the next tier (0 if maxed)
  nextReward: "half" | "free" | null; // what the next tier unlocks
  label: string; // FR label of the ACTIVE reward ("" when none)
}

export function computePromo(items: CartItem[]): PromoResult {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const cheapestUnit = items.length ? Math.min(...items.map((i) => i.price)) : 0;

  let tier: 0 | 1 | 2 = 0;
  if (count >= PROMO.FREE_AT) tier = 2;
  else if (count >= PROMO.HALF_AT) tier = 1;

  let discount = 0;
  let label = "";
  if (tier === 2) {
    discount = Math.round(cheapestUnit);
    label = "offre 4ème gratuit";
  } else if (tier === 1) {
    discount = Math.round(cheapestUnit * 0.5);
    label = "offre 3ème à −50%";
  }

  let itemsToNext = 0;
  let nextReward: "half" | "free" | null = null;
  if (tier === 0) {
    itemsToNext = PROMO.HALF_AT - count;
    nextReward = "half";
  } else if (tier === 1) {
    itemsToNext = PROMO.FREE_AT - count;
    nextReward = "free";
  }

  return {
    count,
    tier,
    subtotal,
    discount,
    total: subtotal - discount,
    cheapestUnit,
    itemsToNext,
    nextReward,
    label,
  };
}
