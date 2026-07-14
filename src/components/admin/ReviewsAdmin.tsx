"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Upload, Star } from "lucide-react";
import CustomerReviews from "@/components/CustomerReviews";

interface Review {
  id: string;
  image: string;
}

/** Resize + JPEG-compress in the browser before upload (same as ProductForm). */
function resizeImage(file: File, maxSize = 900, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject("Resize failed")), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      setReviews(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      // 1) upload the images (client-compressed) -> data URLs
      const form = new FormData();
      for (let i = 0; i < files.length; i++) {
        const resized = await resizeImage(files[i]);
        form.append("files", resized, files[i].name.replace(/\.\w+$/, ".jpg"));
      }
      const up = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (!up.ok) throw new Error();
      const { urls } = await up.json();

      // 2) save them as reviews
      const save = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: urls }),
      });
      if (!save.ok) throw new Error();

      await fetchReviews();
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    setReviews((prev) => prev.filter((r) => r.id !== id)); // optimistic
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
  }

  return (
    <div>
      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-bold mb-1 flex items-center gap-2">
          <Star className="w-4 h-4 text-orange-500" /> Customer Reviews
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Upload screenshots / photos of customer reviews. They appear in a grid at
          the bottom of the homepage. With none uploaded, the section is hidden.
        </p>
        <label className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Upload photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Current reviews (with delete) */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm">Upload your first review photo above.</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-500 mb-3">
            {reviews.length} review{reviews.length > 1 ? "s" : ""} — hover to delete
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
            {reviews.map((r) => (
              <div key={r.id} className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image} alt="Review" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDelete(r.id)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition"
                  aria-label="Delete review"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Live preview — exactly how the homepage renders it */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wide">
              Preview (homepage)
            </p>
            <CustomerReviews images={reviews.map((r) => r.image)} preview />
          </div>
        </>
      )}
    </div>
  );
}
