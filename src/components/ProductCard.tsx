"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store";
import { CLUB_LOGOS, NATIONAL_TEAM_CRESTS } from "@/lib/leagues-data";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  teamName: string;
  teamSlug?: string;
  surCommande: boolean;
  category: string;
}

export default function ProductCard({
  id, name, slug, price, image, teamName, teamSlug = "", surCommande, category,
}: ProductCardProps) {
  const fallbackLogo = teamSlug
    ? (CLUB_LOGOS[teamSlug] || NATIONAL_TEAM_CRESTS[teamSlug] || "")
    : "";
  const displayImage = image || fallbackLogo;
  const wishlist = useWishlistStore();
  const isWished = wishlist.items.includes(id);

  return (
    <Link href={`/product/${slug}`} className="group block">
      <div className="relative bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-300">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          {surCommande && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              PRE-ORDER
            </span>
          )}
          {category === "retro" && (
            <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              RETRO
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); wishlist.toggle(id); }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition"
        >
          <Heart
            className={`w-4 h-4 transition ${isWished ? "fill-orange-500 text-orange-500" : "text-gray-400"}`}
          />
        </button>

        {/* Image */}
        <div className="aspect-square relative bg-gray-50 overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={name}
              className={`absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500 ${
                !image && fallbackLogo ? "object-contain p-4" : "object-cover"
              }`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <span className="text-4xl font-black text-gray-200">{teamName.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wider mb-1">
            {teamName}
          </p>
          <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-500 transition">
            {name}
          </h3>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {price.toFixed(0)} <span className="text-xs text-gray-400 font-normal">MAD</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
