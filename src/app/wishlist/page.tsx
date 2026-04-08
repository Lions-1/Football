"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";

interface WishProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string;
  surCommande: boolean;
  category: string;
  team: { name: string };
}

export default function WishlistPage() {
  const wishlist = useWishlistStore();
  const [products, setProducts] = useState<WishProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlist.items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?limit=100");
        const data = await res.json();
        const filtered = data.products.filter((p: WishProduct) =>
          wishlist.items.includes(p.id)
        );
        setProducts(filtered);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [wishlist.items]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
        <p className="text-gray-500 mb-6">Save your favorite jerseys to find them later.</p>
        <Link href="/products" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition">
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Wishlist ({products.length} items)</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            slug={p.slug}
            price={p.price}
            image={(JSON.parse(p.images) as string[])[0] || ""}
            teamName={p.team.name}
            surCommande={p.surCommande}
            category={p.category}
          />
        ))}
      </div>
    </div>
  );
}
