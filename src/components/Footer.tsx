import Link from "next/link";
import Image from "next/image";
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
          <div className="flex gap-4 mt-4">
            <a href="https://www.instagram.com/mebutiksports" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition" title="Instagram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.facebook.com/share/g/17KZPZsjhE/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition" title="Facebook">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://wa.me/212628552405" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition" title="WhatsApp">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-gray-900 font-semibold text-sm mb-3">SHOP</h4>
          <div className="space-y-2 text-sm">
            <Link href="/products" className="block hover:text-orange-500 transition">All Products</Link>
            <Link href="/products?category=jersey" className="block hover:text-orange-500 transition">Jerseys</Link>
            <Link href="/products?category=retro" className="block hover:text-orange-500 transition">Retro Classics</Link>
            <Link href="/products?category=tracksuit" className="block hover:text-orange-500 transition">Track Suits</Link>
            <Link href="/products?surCommande=true" className="block hover:text-orange-500 transition">Pre-Order</Link>
          </div>
        </div>

        <div>
          <h4 className="text-gray-900 font-semibold text-sm mb-3">LEAGUES</h4>
          <div className="space-y-2 text-sm">
            <Link href="/league/premier-league" className="block hover:text-orange-500 transition">Premier League</Link>
            <Link href="/league/la-liga" className="block hover:text-orange-500 transition">La Liga</Link>
            <Link href="/league/serie-a" className="block hover:text-orange-500 transition">Serie A</Link>
            <Link href="/league/bundesliga" className="block hover:text-orange-500 transition">Bundesliga</Link>
            <Link href="/league/ligue-1" className="block hover:text-orange-500 transition">Ligue 1</Link>
            <Link href="/league/champions-league" className="block hover:text-orange-500 transition">Champions League</Link>
            <Link href="/league/national-teams" className="block hover:text-orange-500 transition">Nations</Link>
            <Link href="/team/morocco" className="block hover:text-orange-500 transition">Morocco</Link>
          </div>
        </div>

        <div>
          <h4 className="text-gray-900 font-semibold text-sm mb-3">HELP</h4>
          <div className="space-y-2 text-sm">
            <a href="https://wa.me/212628552405" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 transition">WhatsApp: +212 628-552405</a>
            <a href="https://www.instagram.com/mebutiksports" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 transition">Instagram: @mebutiksports</a>
            <a href="https://www.facebook.com/share/g/17KZPZsjhE/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="block hover:text-orange-500 transition">Facebook Group</a>
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
