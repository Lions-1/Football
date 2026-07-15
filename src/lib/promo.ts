import type { CartItem } from "@/lib/store";

/**
 * Tiered volume promo, by ITEM COUNT (all products are ~same price):
 *   - 2 items  → FREE delivery
 *   - 3 items  → the 3rd (cheapest) is 50% off
 *   - 4+ items → the 4th (cheapest) is FREE   (replaces the 50% tier)
 *
 * Free delivery is sticky once reached (still free at 3 and 4 items). The
 * item discount tiers upgrade (they do not stack) and apply once per order.
 * Everything here is pure/derived from the cart — nothing is stored.
 */
export const PROMO = {
  DELIVERY_AT: 2, // reach 2 items → free delivery
  HALF_AT: 3, // reach 3 items → 50% off one
  FREE_AT: 4, // reach 4 items → one free
} as const;

export interface PromoResult {
  count: number; // total quantity in cart
  tier: 0 | 1 | 2; // item-discount tier: 0 none, 1 half-off, 2 free
  freeDelivery: boolean; // 2+ items
  subtotal: number; // before discount
  discount: number; // amount reduced (integer MAD)
  total: number; // subtotal - discount
  cheapestUnit: number; // price of the discounted/free unit
  itemsToNext: number; // items still needed to reach the next reward (0 if maxed)
  nextReward: "delivery" | "half" | "free" | null; // what the next tier unlocks
  label: string; // FR label of the ACTIVE item discount ("" when none)
}

export function computePromo(items: CartItem[]): PromoResult {
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const cheapestUnit = items.length ? Math.min(...items.map((i) => i.price)) : 0;

  const freeDelivery = count >= PROMO.DELIVERY_AT;

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
  let nextReward: "delivery" | "half" | "free" | null = null;
  if (count < PROMO.DELIVERY_AT) {
    itemsToNext = PROMO.DELIVERY_AT - count;
    nextReward = "delivery";
  } else if (count < PROMO.HALF_AT) {
    itemsToNext = PROMO.HALF_AT - count;
    nextReward = "half";
  } else if (count < PROMO.FREE_AT) {
    itemsToNext = PROMO.FREE_AT - count;
    nextReward = "free";
  }

  return {
    count,
    tier,
    freeDelivery,
    subtotal,
    discount,
    total: subtotal - discount,
    cheapestUnit,
    itemsToNext,
    nextReward,
    label,
  };
}
