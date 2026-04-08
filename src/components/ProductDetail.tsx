"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, ShoppingBag, ChevronRight, Check } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import ProductCard from "./ProductCard";

interface ProductProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[];
  sizes: string[];
  teamName: string;
  leagueName: string;
  leagueSlug: string;
  teamSlug: string;
  surCommande: boolean;
  category: string;
  season: string | null;
}

interface RelatedProduct {
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

export default function ProductDetail({
  product,
  related,
}: {
  product: ProductProps;
  related: RelatedProduct[];
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [added, setAdded] = useState(false);

  const cart = useCartStore();
  const wishlist = useWishlistStore();
  const isWished = wishlist.items.includes(product.id);

  function handleAddToCart() {
    if (!selectedSize) return;
    cart.addItem({
      productId: product.id,
      name: product.name,
      image: product.images[0] || "",
      price: product.price,
      size: selectedSize,
      quantity: 1,
      surCommande: product.surCommande,
      customName: customName || undefined,
      customNumber: customNumber || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 overflow-hidden min-w-0">
        <Link href="/" className="hover:text-gray-900 transition">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/league/${product.leagueSlug}`} className="hover:text-gray-900 transition">
          {product.leagueName}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/team/${product.teamSlug}`} className="hover:text-gray-900 transition">
          {product.teamName}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-400 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            {product.images[selectedImage] ? (
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-20 h-20 text-gray-300" />
              </div>
            )}
            {product.surCommande ? (
              <span className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                PRE-ORDER
              </span>
            ) : (
              <span className="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                AVAILABLE
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    i === selectedImage ? "border-orange-500" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <Image src={img} alt="" width={80} height={80} className="object-cover w-full h-full" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-xs text-orange-500 font-medium uppercase tracking-wider mb-1">
            {product.teamName} · {product.leagueName}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
          {product.season && (
            <p className="text-sm text-gray-500 mb-3">Season: {product.season}</p>
          )}
          <p className="text-3xl font-black mb-6">
            ${product.price.toFixed(0)} <span className="text-base text-gray-400 font-normal">USD</span>
          </p>

          {product.description && (
            <p className="text-sm text-gray-400 leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Size selector */}
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2">
              Size {selectedSize && <span className="text-orange-400">— {selectedSize}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    selectedSize === size
                      ? "bg-orange-500 text-black border-orange-500"
                      : "bg-white border-gray-200 hover:border-orange-400 text-gray-900"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Custom name/number for sur commande */}
          {product.surCommande && (
            <div className="mb-6 space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm font-semibold text-orange-600">Custom Order Details</p>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Player Name (optional)</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. MESSI"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Number (optional)</label>
                <input
                  type="text"
                  value={customNumber}
                  onChange={(e) => setCustomNumber(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition ${
                !selectedSize
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : added
                  ? "bg-orange-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" /> Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  {selectedSize ? "Add to Cart" : "Select a Size"}
                </>
              )}
            </button>
            <button
              onClick={() => wishlist.toggle(product.id)}
              className={`p-3 rounded-lg border transition ${
                isWished
                  ? "bg-orange-50 border-orange-300 text-orange-500"
                  : "bg-white border-gray-200 text-gray-700 hover:border-orange-300"
              }`}
            >
              <Heart className={`w-5 h-5 ${isWished ? "fill-current" : ""}`} />
            </button>
          </div>

          {!selectedSize && (
            <p className="text-xs text-orange-500 mt-2">Please select a size to add to cart</p>
          )}

          {/* WhatsApp Order Button */}
          <a
            href={`https://wa.me/21261614253?text=${encodeURIComponent(
              `Hi, I'd like to order:\n*${product.name}*${selectedSize ? `\nSize: ${selectedSize}` : ""}\nPrice: $${product.price} USD\n\nPlease confirm availability.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-lg font-bold text-sm bg-[#25D366] hover:bg-[#20bd5a] text-white transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Order via WhatsApp
          </a>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold mb-6">More from {product.teamName}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
