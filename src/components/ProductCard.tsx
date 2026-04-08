"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useWishlistStore } from "@/lib/store";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  teamName: string;
  surCommande: boolean;
  category: string;
}

export default function ProductCard({
  id, name, slug, price, image, teamName, surCommande, category,
}: ProductCardProps) {
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
          {image ? (
            <img
              src={image}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 flex flex-col items-center justify-center gap-2 p-4">
              <ShoppingBag className="w-10 h-10 text-orange-300" />
              <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide text-center leading-tight line-clamp-2">{teamName}</span>
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
            ${price.toFixed(0)} <span className="text-xs text-gray-400 font-normal">USD</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
