"use client";

import { useState } from "react";
import { Plus, X, Save, Upload } from "lucide-react";
import { CATEGORIES, SIZES } from "@/lib/leagues-data";

// Admin quick-presets so the most common size combinations are a single tap
// away when filling out a new product.
const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "Adult",     sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Adult + XXXL", sizes: ["S", "M", "L", "XL", "XXL", "XXXL"] },
  { label: "All",       sizes: [...SIZES] },
  { label: "Clear",     sizes: [] },
];

interface Team {
  id: string;
  name: string;
  slug: string;
  league: { id: string; name: string };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string;
  sizes: string;
  category: string;
  surCommande: boolean;
  featured: boolean;
  bestSeller: boolean;
  inStock: boolean;
  season: string | null;
  teamId: string;
}

interface Props {
  teams: Team[];
  product: Product | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ProductForm({ teams, product, onSaved, onCancel }: Props) {
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [teamId, setTeamId] = useState(product?.teamId || "");
  const [category, setCategory] = useState(product?.category || "jersey");
  const [season, setSeason] = useState(product?.season || "");
  const [surCommande, setSurCommande] = useState(product?.surCommande || false);
  const [featured, setFeatured] = useState(product?.featured || false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller || false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    product ? JSON.parse(product.sizes) : [...SIZES]
  );
  const [images, setImages] = useState<string[]>(
    product ? JSON.parse(product.images) : []
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New league/team creation
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeagueId, setNewTeamLeagueId] = useState("");
  const [showNewLeague, setShowNewLeague] = useState(false);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [localTeams, setLocalTeams] = useState<Team[]>(teams);

  function addImage() {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setImages([...images, ...(data.urls || [])]);
      } else {
        setError("Image upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  async function createLeague() {
    if (!newLeagueName.trim()) return;
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeagueName.trim() }),
      });
      if (res.ok) {
        setNewLeagueName("");
        setShowNewLeague(false);
        // Refresh teams
        const teamRes = await fetch("/api/admin/teams");
        const teamData = await teamRes.json();
        setLocalTeams(teamData || []);
      }
    } catch {
      // ignore
    }
  }

  async function createTeam() {
    if (!newTeamName.trim() || !newTeamLeagueId) return;
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim(), leagueId: newTeamLeagueId }),
      });
      if (res.ok) {
        const team = await res.json();
        setLocalTeams([...localTeams, team]);
        setTeamId(team.id);
        setNewTeamName("");
        setShowNewTeam(false);
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name || !price || !teamId) {
      setError("Name, price, and team are required.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name,
        description: description || null,
        price: parseFloat(price),
        images,
        sizes: selectedSizes,
        teamId,
        category,
        season: season || null,
        surCommande,
        featured,
        bestSeller,
      };

      const url = isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // Group teams by league for the dropdown
  const leagues = Array.from(new Set(localTeams.map((t) => t.league.name)));

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{isEdit ? "Edit Product" : "Add New Product"}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-900 transition">
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Product Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Real Madrid 2025/26 Home Kit Player Version"
          required
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Price */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Price (USD) *</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="280"
          required
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Team */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-400">Team *</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowNewLeague(!showNewLeague)} className="text-[10px] text-orange-400 hover:underline">
              + League
            </button>
            <button type="button" onClick={() => setShowNewTeam(!showNewTeam)} className="text-[10px] text-orange-400 hover:underline">
              + Team
            </button>
          </div>
        </div>

        {showNewLeague && (
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              type="text"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              placeholder="New league name"
              className="flex-1 min-w-[160px] bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
            />
            <button type="button" onClick={createLeague} className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg">
              Add
            </button>
          </div>
        )}

        {showNewTeam && (
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2 mb-2">
            <select
              value={newTeamLeagueId}
              onChange={(e) => setNewTeamLeagueId(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
            >
              <option value="">Select league</option>
              {Array.from(new Set(localTeams.map((t) => JSON.stringify({ id: t.league.id, name: t.league.name })))).map((s) => {
                const l = JSON.parse(s);
                return <option key={l.id} value={l.id}>{l.name}</option>;
              })}
            </select>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="New team name"
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
            />
            <button type="button" onClick={createTeam} className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg">
              Add
            </button>
          </div>
        )}

        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          required
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
        >
          <option value="">Select team</option>
          {leagues.map((league) => (
            <optgroup key={league} label={league}>
              {localTeams.filter((t) => t.league.name === league).map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Category + Season */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Season</label>
          <input
            type="text"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="2025/26"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Sizes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Sizes</label>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelectedSizes(preset.sizes)}
                className="text-[10px] font-semibold uppercase tracking-wide text-orange-500 hover:text-orange-600 hover:underline"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                selectedSizes.includes(size)
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">Images</label>

        {/* Upload files */}
        <div className="mb-3">
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition">
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Upload images"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Or paste URL */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Or paste image URL..."
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={addImage}
            className="p-2 bg-orange-500 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    MAIN
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-orange-500 resize-none"
        />
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={surCommande}
            onChange={(e) => setSurCommande(e.target.checked)}
            className="accent-orange-500"
          />
          <span className="text-orange-600 font-medium">Pre-order</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="accent-orange-500"
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(e) => setBestSeller(e.target.checked)}
            className="accent-orange-500"
          />
          Best Seller
        </label>
      </div>

      {/* Sticky bottom save bar — always reachable on long forms, especially on mobile */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-0 px-4 sm:px-0 pt-4 pb-4 bg-gradient-to-t from-white via-white to-white/90 backdrop-blur-sm border-t border-gray-100 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 px-4 py-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
