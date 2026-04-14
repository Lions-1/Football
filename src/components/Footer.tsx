import Link from "next/link";
import Image from "next/image";
import { Globe, Mail, Phone } from "lucide-react";
import { BRAND_LOGOS } from "@/lib/leagues-data";

export default function Footer() {
  const doubled = [...BRAND_LOGOS, ...BRAND_LOGOS];

  return (
    <footer className="bg-gray-50 text-gray-600 mt-auto border-t border-gray-200">
      {/* Our Brands — infinite scrolling marquee */}
      <div className="border-b border-gray-200 py-8 overflow-hidden">
        <h3 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Our Brands</h3>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 to-transparent z-10" />
          <div className="flex animate-marquee w-max items-center">
            {doubled.map((brand, i) => (
              <div
                key={`${brand.name}-${i}`}
                className="flex items-center gap-3 mx-8 shrink-0 group cursor-default"
              >
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={40}
                  height={40}
                  className="object-contain grayscale group-hover:grayscale-0 transition-all duration-300 opacity-60 group-hover:opacity-100"
                  unoptimized
                />
                <span className="text-sm font-bold text-gray-400 group-hover:text-gray-700 transition-colors uppercase tracking-wider whitespace-nowrap">
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link href="/" className="text-xl font-black text-gray-900 tracking-wider">
            <span className="text-orange-500">MEBUTIK</span>SPORTS
          </Link>
          <p className="mt-3 text-sm leading-relaxed">
            Your destination for authentic football jerseys, retro kits, and sportswear.
          </p>
          <div className="flex gap-3 mt-4">
            <a href="https://wa.me/21261614253" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">
              <Phone className="w-5 h-5" />
            </a>
            <a href="mailto:contact@mebutiksports.com" className="hover:text-orange-500 transition"><Mail className="w-5 h-5" /></a>
            <a href="https://mebutiksports.com" className="hover:text-orange-500 transition"><Globe className="w-5 h-5" /></a>
          </div>
        </div>

        <div>
          <h4 className="text-gray-900 font-semibold text-sm mb-3">SHOP</h4>
          <div className="space-y-2 text-sm">
            <Link href="/products" className="block hover:text-orange-500 transition">All Products</Link>
            <Link href="/products?category=jersey" className="block hover:text-orange-500 transition">Jerseys</Link>
            <Link href="/products?category=retro" className="block hover:text-orange-500 transition">Retro Shirts</Link>
            <Link href="/products?category=tracksuit" className="block hover:text-orange-500 transition">Track Suits</Link>
            <Link href="/products?surCommande=true" className="block hover:text-orange-500 transition">Sur Commande</Link>
          </div>
        </div>

        <div>
          <h4 className="text-gray-900 font-semibold text-sm mb-3">LEAGUES</h4>
          <div className="space-y-2 text-sm">
            <Link href="/league/national-teams" className="block hover:text-orange-500 transition">World Cup 2026</Link>
            <Link href="/league/premier-league" className="block hover:text-orange-500 transition">Premier League</Link>
            <Link href="/league/la-liga" className="block hover:text-orange-500 transition">La Liga</Link>
            <Link href="/league/bundesliga" className="block hover:text-orange-500 transition">Bundesliga</Link>
            <Link href="/league/serie-a" className="block hover:text-orange-500 transition">Serie A</Link>
            <Link href="/league/ligue-1" className="block hover:text-orange-500 transition">Ligue 1</Link>
            <Link href="/league/champions-league" className="block hover:text-orange-500 transition">Champions League</Link>
            <Link href="/league/f1" className="block hover:text-orange-500 transition">F1 2025</Link>
          </div>
        </div>

        <div>
          <h4 className="text-gray-900 font-semibold text-sm mb-3">HELP</h4>
          <div className="space-y-2 text-sm">
            <a href="https://wa.me/21261614253" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 transition">WhatsApp: +212 61614253</a>
            <Link href="/contact" className="block hover:text-orange-500 transition">Contact Us</Link>
            <Link href="/faq" className="block hover:text-orange-500 transition">FAQ</Link>
            <Link href="/cart" className="block hover:text-orange-500 transition">My Cart</Link>
            <Link href="/wishlist" className="block hover:text-orange-500 transition">Wishlist</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} mebutiksports.com — All rights reserved.
      </div>
    </footer>
  );
}
