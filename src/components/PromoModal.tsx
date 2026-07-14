"use client";

import Link from "next/link";
import { create } from "zustand";
import { X, Lock, Gift, ArrowRight, Check } from "lucide-react";
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

export default function PromoModal() {
  const open = usePromoModal((s) => s.open);
  const hide = usePromoModal((s) => s.hide);
  const items = useCartStore((s) => s.items);

  if (!open) return null;

  const promo = computePromo(items);
  const unlocked = promo.tier === 2;
  const target = promo.tier === 0 ? PROMO.HALF_AT : PROMO.FREE_AT;
  const pct = Math.min(100, Math.round((promo.count / target) * 100));

  const plural = promo.itemsToNext > 1 ? "s" : "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={hide}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={hide}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-gray-500 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header banner */}
        <div
          className={`px-6 pt-7 pb-6 text-center ${
            unlocked
              ? "bg-gradient-to-br from-emerald-500 to-green-600"
              : "bg-gradient-to-br from-orange-500 to-orange-600"
          }`}
        >
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            {unlocked ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {unlocked ? "Offre débloquée" : "Offre à débloquer"}
          </div>

          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/15 flex items-center justify-center">
            <Gift className="w-8 h-8 text-white" />
          </div>

          {promo.tier === 0 && (
            <>
              <p className="text-white font-heading text-xl font-black leading-tight">
                Achetez 3 = le 3ème à −50%
              </p>
              <p className="text-white/85 text-sm mt-1">
                Plus que <b>{promo.itemsToNext}</b> article{plural} pour débloquer
              </p>
            </>
          )}
          {promo.tier === 1 && (
            <>
              <p className="text-white font-heading text-xl font-black leading-tight">
                🎉 3ème article à −50% !
              </p>
              <p className="text-white/85 text-sm mt-1">
                Ajoutez <b>{promo.itemsToNext}</b> article pour le <b>4ème GRATUIT</b>
              </p>
            </>
          )}
          {promo.tier === 2 && (
            <>
              <p className="text-white font-heading text-xl font-black leading-tight">
                Félicitations 🎉
              </p>
              <p className="text-white/90 text-sm mt-1">
                Votre 4ème article est <b>OFFERT</b>
              </p>
            </>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1.5">
            <span>{promo.count} article{promo.count > 1 ? "s" : ""}</span>
            <span>
              {unlocked ? "Objectif atteint" : `Objectif : ${target}`}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                unlocked ? "bg-emerald-500" : "bg-orange-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {promo.discount > 0 && (
            <p className="text-center text-sm text-gray-600 mt-4">
              Vous économisez{" "}
              <span className="font-bold text-orange-600">
                {promo.discount.toFixed(0)} MAD
              </span>
            </p>
          )}

          {/* Actions */}
          {unlocked ? (
            <Link
              href="/cart"
              onClick={hide}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition"
            >
              Finaliser ma commande <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={hide}
              className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
            >
              Continuer mes achats
            </button>
          )}

          <p className="text-center text-[11px] text-gray-400 mt-3">
            🔒 Sécurisé · 🚚 Livraison Maroc · Paiement à la livraison
          </p>
        </div>
      </div>
    </div>
  );
}
