"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Photo wall of customer reviews. Renders NOTHING when there are no images
 * (so the homepage shows no trace of the section until the admin adds pics).
 * Used both on the homepage and, as a live preview, inside the admin panel.
 */
export default function CustomerReviews({
  images,
  preview = false,
}: {
  images: string[];
  preview?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <section className={preview ? "" : "mx-auto max-w-7xl px-4 py-16"}>
      {!preview && (
        <div className="mb-10 text-center">
          <p className="text-orange-500 text-xs font-bold tracking-[0.3em] uppercase mb-2">
            Ils nous font confiance
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase">
            Avis clients
          </h2>
          <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
            Nos clients partagent leurs commandes reçues.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(src)}
            className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Avis client ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            onClick={() => setActive(null)}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active}
            alt="Avis client"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
