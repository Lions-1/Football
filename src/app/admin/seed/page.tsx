"use client";

import { useState } from "react";
import { Layers, Check, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    leagues?: number;
    teams?: number;
    products?: number;
    newProducts?: number;
    error?: string;
  } | null>(null);

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Failed to seed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="p-4 bg-orange-50 rounded-full w-fit mx-auto mb-6">
        <Layers className="w-10 h-10 text-orange-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Seed Database</h1>
      <p className="text-gray-400 text-sm mb-8">
        This will create an admin user, all leagues, teams, and sample products.
        <br />
        <span className="text-amber-400">Default login: admin / admin123</span>
      </p>

      {result && (
        <div className={`mb-6 p-4 rounded-xl border text-sm ${
          result.success
            ? "bg-orange-50 border-orange-200 text-orange-600"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {result.success ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 font-bold">
                <Check className="w-4 h-4" /> Seeded successfully!
              </div>
              <p>{result.leagues} leagues · {result.teams} teams · {result.products} total products ({result.newProducts} new)</p>
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}

      <button
        onClick={handleSeed}
        disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</>
        ) : (
          "Seed Now"
        )}
      </button>

      <div className="mt-6">
        <Link href="/admin" className="text-sm text-orange-500 hover:underline">
          ← Back to Admin
        </Link>
      </div>
    </div>
  );
}
