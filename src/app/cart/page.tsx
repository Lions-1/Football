"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Gift } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { computePromo } from "@/lib/promo";

const WHATSAPP_NUMBER = "212628552405";

export default function CartPage() {
  const cart = useCartStore();
  const promo = computePromo(cart.items);

  function buildWhatsAppLink() {
    const lines = cart.items.map((item) => {
      const extras = [
        `Size: ${item.size}`,
        item.surCommande ? "Sur Commande" : null,
        item.customName ? `Name: ${item.customName}` : null,
        item.customNumber ? `#${item.customNumber}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `• ${item.name} (x${item.quantity})\n   ${extras}\n   ${(item.price * item.quantity).toFixed(0)} MAD`;
    });

    const message =
      `Hi, I'd like to order:\n\n` +
      `${lines.join("\n\n")}\n\n` +
      (promo.discount > 0
        ? `Sous-total: ${promo.subtotal.toFixed(0)} MAD\n` +
          `Réduction (${promo.label}): −${promo.discount.toFixed(0)} MAD\n`
        : ``) +
      `*Total: ${promo.total.toFixed(0)} MAD*\n\n` +
      `Please confirm availability and delivery.`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Browse our collection and find your next jersey!</p>
        <Link href="/products" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition">
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart ({cart.count()} items)</h1>

      <div className="space-y-3 mb-8">
        {cart.items.map((item) => (
          <div key={`${item.productId}-${item.size}`} className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4">
            <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0 relative">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{item.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Size: {item.size}
                {item.surCommande && " · Sur Commande"}
                {item.customName && ` · Name: ${item.customName}`}
                {item.customNumber && ` · #${item.customNumber}`}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cart.updateQuantity(item.productId, item.size, item.quantity - 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => cart.updateQuantity(item.productId, item.size, item.quantity + 1)}
                    className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{(item.price * item.quantity).toFixed(0)} MAD</span>
                  <button
                    onClick={() => cart.removeItem(item.productId, item.size)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Promo progress nudge */}
      {promo.tier < 2 && promo.itemsToNext > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
          <Gift className="w-5 h-5 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700">
            Ajoutez <b>{promo.itemsToNext}</b> article{promo.itemsToNext > 1 ? "s" : ""} pour{" "}
            {promo.nextReward === "free" ? (
              <b>le 4ème GRATUIT</b>
            ) : (
              <b>le 3ème à −50%</b>
            )}
            .
          </p>
        </div>
      )}
      {promo.tier === 2 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
          <Gift className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-emerald-700">
            🎉 Offre appliquée : votre 4ème article est <b>OFFERT</b>.
          </p>
        </div>
      )}

      {/* Total */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6 space-y-2">
        {promo.discount > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span>{promo.subtotal.toFixed(0)} MAD</span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-orange-600">
              <span>Réduction ({promo.label})</span>
              <span>−{promo.discount.toFixed(0)} MAD</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>{promo.total.toFixed(0)} MAD</span>
        </div>
      </div>

      {/* Order via WhatsApp */}
      <a
        href={buildWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-lg transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Order via WhatsApp — {promo.total.toFixed(0)} MAD
      </a>
      <p className="text-xs text-gray-400 text-center mt-3">
        Tap to send your order on WhatsApp. We&apos;ll confirm availability, price and delivery with you directly.
      </p>
    </div>
  );
}
