"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/store";

export default function CartPage() {
  const cart = useCartStore();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            customName: item.customName,
            customNumber: item.customNumber,
            price: item.price,
          })),
        }),
      });

      if (res.ok) {
        setSuccess(true);
        cart.clearCart();
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-gray-400 mb-6">Thank you for your order. We will contact you to confirm the details.</p>
        <Link href="/products" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition">
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
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

      {/* Total */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>{cart.total().toFixed(0)} MAD</span>
        </div>
      </div>

      {!checkoutOpen ? (
        <button
          onClick={() => setCheckoutOpen(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition"
        >
          Proceed to Checkout
        </button>
      ) : (
        <form onSubmit={handleCheckout} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">Checkout Details</h2>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Phone Number *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Delivery Address (optional)</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {submitting ? "Placing Order..." : `Place Order — ${cart.total().toFixed(0)} MAD`}
          </button>
        </form>
      )}
    </div>
  );
}
