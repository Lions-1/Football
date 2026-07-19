"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Search, ShoppingCart, Heart, Menu, X } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { MAIN_NAV_BUCKETS } from "@/lib/leagues-data";

/**
 * Two-row top nav on desktop:
 *   row 1 — logo on the left, search/wishlist/cart on the right
 *   row 2 — the eight category buckets, evenly spaced and centered
 *
 * Mobile collapses both rows behind a hamburger drawer.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const cartCount = useCartStore((s) => s.count());
  const wishlistCount = useWishlistStore((s) => s.items.length);

  // Close the mobile drawer as soon as the user scrolls, so they see the page
  // instead of having to tap the X.
  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [mobileOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileOpen(false);
      setSearchQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Row 1 — logo / search / wishlist / cart */}
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="Mebutik Sports" width={40} height={40} className="object-contain" priority />
          <span className="text-base sm:text-xl lg:text-2xl font-black tracking-wider text-gray-900">
            <span className="text-orange-500">MEBUTIK</span>SPORTS
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4 text-gray-700">
          {/* Desktop search */}
          <div className="hidden sm:flex sm:items-center">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-3 py-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jerseys..."
                  className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-48"
                  autoFocus
                />
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="hover:text-orange-500 transition p-2"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          <Link
            href="/wishlist"
            className="relative hover:text-orange-500 transition p-2"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            className="relative hover:text-orange-500 transition p-2"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Row 2 — the 8 category buckets (desktop only) */}
      <nav className="hidden lg:block border-t border-gray-100">
        <ul className="mx-auto max-w-7xl flex items-center justify-center gap-1 px-4">
          {MAIN_NAV_BUCKETS.map((bucket) => (
            <li key={bucket.slug}>
              <Link
                href={bucket.href}
                className="block px-3.5 py-3 text-[13px] font-semibold tracking-wide uppercase text-gray-700 hover:text-orange-500 transition"
              >
                {bucket.short}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-lg px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jerseys..."
                className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none flex-1"
              />
            </form>

            <ul className="grid grid-cols-2 gap-2 pt-2">
              {MAIN_NAV_BUCKETS.map((bucket) => (
                <li key={bucket.slug}>
                  <Link
                    href={bucket.href}
                    className="block text-sm font-semibold tracking-wide uppercase text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-500 rounded-lg px-3 py-2.5 transition text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    {bucket.short}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="pt-2 border-t border-gray-100">
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-orange-500 hover:underline py-2"
              >
                See all products →
              </Link>
              <a
                href="https://wa.me/212628552405"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-semibold text-green-600 hover:underline py-2"
              >
                Order on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
