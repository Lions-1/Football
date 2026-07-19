"use client";

import Link from "next/link";
import { create } from "zustand";
import {
  X, Lock, Gift, ArrowRight, Check, ShieldCheck, Truck, Percent,
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { computePromo, PROMO } from "@/lib/promo";

/** Non-persisted UI store so any component can pop the promo modal. */
interface PromoModalUI {
  open: boolean;
  show: () => void;
  hide: () => void;
}
export const usePromoModal = create<PromoModalUI>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

function TierRow({
  reached,
  count,
  reward,
  Icon,
}: {
  reached: boolean;
  count: number;
  reward: string;
  Icon: typeof Gift;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
        reached ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          reached ? "bg-emerald-500 text-white" : "bg-white text-gray-400 border border-gray-200"
        }`}
      >
        {reached ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold leading-tight ${reached ? "text-emerald-700" : "text-gray-700"}`}>
          {reward}
        </p>
        <p className="text-[11px] text-gray-400">From {count} items</p>
      </div>
      {reached && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Active</span>
      )}
    </div>
  );
}

export default function PromoModal() {
  const open = usePromoModal((s) => s.open);
  const hide = usePromoModal((s) => s.hide);
  const items = useCartStore((s) => s.items);

  if (!open) return null;

  const promo = computePromo(items);
  const unlocked = promo.nextReward === null; // everything unlocked (4+ items)
  const pct = Math.min(100, Math.round((promo.count / PROMO.FREE_AT) * 100));
  const plural = promo.itemsToNext > 1 ? "s" : "";

  const headline =
    promo.nextReward === "delivery"
      ? "FREE delivery from 2 items"
      : promo.nextReward === "half"
      ? "3rd item 50% OFF"
      : promo.nextReward === "free"
      ? "4th item FREE"
      : "Congratulations 🎉";

  return (
    <div
      className="promo-overlay fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={hide}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="promo-card relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={hide}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/25 p-1.5 text-white backdrop-blur transition hover:bg-white/40"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div
          className={`relative overflow-hidden px-6 pb-7 pt-8 text-center ${
            unlocked
              ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700"
              : "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600"
          }`}
        >
          <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />

          <div className="relative">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              {unlocked ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {unlocked ? "Offers unlocked" : "Unlock your offer"}
            </span>

            {/* Medallion */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/25">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Gift className={`h-7 w-7 ${unlocked ? "text-emerald-600" : "text-orange-500"}`} />
              </div>
            </div>

            <h3 className="font-heading text-2xl font-black leading-tight text-white">{headline}</h3>
            {unlocked ? (
              <p className="mt-1.5 text-sm text-white/90">
                4th item <b className="font-extrabold">FREE</b> + free delivery
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-white/90">
                Just <b className="font-extrabold">{promo.itemsToNext}</b> more item{plural} to unlock it
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Progress */}
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-900">
              {promo.count} / {PROMO.FREE_AT} items
            </span>
            {promo.discount > 0 ? (
              <span className={unlocked ? "text-emerald-600" : "text-orange-600"}>
                {promo.discount.toFixed(0)} MAD saved
              </span>
            ) : (
              <span className="text-gray-400">Goal: {PROMO.FREE_AT}</span>
            )}
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                unlocked
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                  : "bg-gradient-to-r from-orange-400 to-orange-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Tier steps */}
          <div className="mt-4 space-y-2">
            <TierRow reached={promo.freeDelivery} count={PROMO.DELIVERY_AT} reward="FREE delivery" Icon={Truck} />
            <TierRow reached={promo.count >= PROMO.HALF_AT} count={PROMO.HALF_AT} reward="3rd item 50% OFF" Icon={Percent} />
            <TierRow reached={promo.count >= PROMO.FREE_AT} count={PROMO.FREE_AT} reward="4th item FREE" Icon={Gift} />
          </div>

          {/* Action */}
          {promo.count > 0 && promo.freeDelivery ? (
            <Link
              href="/cart"
              onClick={hide}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-bold text-white shadow-sm transition hover:bg-emerald-600"
            >
              Complete my order <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={hide}
              className="mt-5 w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white shadow-sm transition hover:bg-orange-600"
            >
              Continue shopping
            </button>
          )}

          {/* Trust row — real icons, not emoji */}
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-medium text-gray-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure
            </span>
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Morocco delivery
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
