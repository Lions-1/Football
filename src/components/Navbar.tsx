"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Heart, Menu, X, ChevronDown } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface League {
  id: string;
  name: string;
  slug: string;
  teams: { id: string; name: string; slug: string }[];
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const megaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const cartCount = useCartStore((s) => s.count());
  const wishlistCount = useWishlistStore((s) => s.items.length);

  useEffect(() => {
    fetch("/api/leagues")
      .then((r) => r.json())
      .then((data) => setLeagues(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-gray-900 text-white text-xs">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-1.5">
          <span className="hidden sm:block text-gray-300">Free delivery on orders over $500</span>
          <div className="flex items-center gap-4">
            <a href="https://wa.me/21261614253" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition">WhatsApp</a>
            <Link href="/contact" className="text-gray-300 hover:text-white transition">Contact</Link>
            <Link href="/faq" className="text-gray-300 hover:text-white transition">FAQ</Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Mebutik Sports" width={44} height={44} className="object-contain" priority />
          <span className="text-lg sm:text-2xl font-black tracking-wider text-gray-900">
            <span className="text-orange-500">MEBUTIK</span>SPORTS
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link href="/products" className="hover:text-orange-500 transition">
            ALL PRODUCTS
          </Link>
          <div ref={megaRef} className="relative">
            <button
              onClick={() => setMegaOpen(!megaOpen)}
              className="flex items-center gap-1 hover:text-orange-500 transition"
            >
              LEAGUES <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {megaOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[700px] bg-white border border-gray-200 rounded-xl shadow-2xl p-6 grid grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
                {leagues.map((league) => (
                  <div key={league.id}>
                    <Link
                      href={`/league/${league.slug}`}
                      className="text-orange-500 font-semibold text-xs uppercase tracking-wider block mb-2 hover:underline"
                      onClick={() => setMegaOpen(false)}
                    >
                      {league.name}
                    </Link>
                    <div className="space-y-1">
                      {league.teams.slice(0, 6).map((team) => (
                        <Link
                          key={team.id}
                          href={`/team/${team.slug}`}
                          className="block text-xs text-gray-500 hover:text-gray-900 transition"
                          onClick={() => setMegaOpen(false)}
                        >
                          {team.name}
                        </Link>
                      ))}
                      {league.teams.length > 6 && (
                        <Link
                          href={`/league/${league.slug}`}
                          className="block text-xs text-orange-500 hover:underline"
                          onClick={() => setMegaOpen(false)}
                        >
                          View all →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/league/national-teams" className="hover:text-orange-500 transition">
            WORLD CUP 2026
          </Link>
          <a
            href="https://wa.me/21261614253"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-orange-500 transition"
          >
            PRE-ORDER
          </a>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3 text-gray-700">
          {/* Search */}
          <div className="hidden sm:flex sm:items-center">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-3 py-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jerseys..."
                  className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-40"
                  autoFocus
                />
                <button type="button" onClick={() => setSearchOpen(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="hover:text-orange-500 transition">
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>

          <Link href="/wishlist" className="relative hover:text-orange-500 transition">
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link href="/cart" className="relative hover:text-orange-500 transition">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="flex bg-gray-100 rounded-lg px-3 py-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jerseys..."
              className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none flex-1"
            />
            <Search className="w-4 h-4 text-gray-400" />
          </form>
          <Link href="/products" className="block text-sm font-medium text-gray-700 hover:text-orange-500" onClick={() => setMobileOpen(false)}>ALL PRODUCTS</Link>
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/league/${league.slug}`}
              className="block text-sm text-gray-500 hover:text-orange-500"
              onClick={() => setMobileOpen(false)}
            >
              {league.name}
            </Link>
          ))}
          <a href="https://wa.me/21261614253" target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-gray-700 hover:text-orange-500" onClick={() => setMobileOpen(false)}>PRE-ORDER</a>
        </div>
      )}
    </header>
  );
}
