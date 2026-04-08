"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "./ProductCard";

interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  teamName: string;
  teamSlug: string;
  surCommande: boolean;
  category: string;
}

const TABS = [
  { key: "new" as const, label: "New Arrivals" },
  { key: "featured" as const, label: "Featured" },
  { key: "best" as const, label: "Best Sellers" },
];

export default function HomeProducts() {
  const [tab, setTab] = useState<"new" | "featured" | "best">("new");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/home-products?tab=${tab}`)
      .then((r) => r.json())
      .then((data: ProductData[]) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm font-semibold pb-1 border-b-2 transition ${
                tab === t.key
                  ? "text-orange-500 border-orange-500"
                  : "text-gray-400 border-transparent hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link href="/products" className="text-sm text-orange-400 hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              slug={product.slug}
              price={product.price}
              image={product.images[0] || ""}
              teamName={product.teamName}
              teamSlug={product.teamSlug}
              surCommande={product.surCommande}
              category={product.category}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No products in this category yet.</p>
        </div>
      )}
    </section>
  );
}
