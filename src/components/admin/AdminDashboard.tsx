"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, Trash2, Edit3, Package, ShoppingCart,
  Search, ChevronLeft, ChevronRight, Eye, BarChart3, Star,
} from "lucide-react";
import ProductForm from "./ProductForm";
import ReviewsAdmin from "./ReviewsAdmin";

interface Team {
  id: string;
  name: string;
  slug: string;
  league: { id: string; name: string };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string;
  sizes: string;
  category: string;
  surCommande: boolean;
  featured: boolean;
  bestSeller: boolean;
  inStock: boolean;
  season: string | null;
  description: string | null;
  teamId: string;
  team: { name: string; league: { name: string } };
  createdAt: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
  items: { id: string; size: string; quantity: number; price: number; product: { name: string } }[];
}

type Tab = "products" | "add" | "orders" | "edit" | "stats" | "reviews";

/**
 * Tiny pill button used in the product list. Click flips the flag.
 * Filled when active, soft-tinted when idle so the admin can scan a row
 * and instantly see what's a Best Seller, what's Featured, etc.
 */
function FlagToggle({
  active,
  onClick,
  label,
  activeColor,
  idleColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeColor: string;
  idleColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Click to ${active ? "remove from" : "add to"} ${label}`}
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border transition ${
        active ? activeColor : idleColor
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [prodPage, setProdPage] = useState(1);
  const [prodSearch, setProdSearch] = useState("");
  const prodLimit = 25;

  const fetchProducts = useCallback(async (page: number, search: string) => {
    setLoading(true);
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/admin/products?page=${page}&limit=${prodLimit}${q}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotalProducts(data.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams");
      const data = await res.json();
      setTeams(data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchProducts(prodPage, prodSearch);
  }, [fetchProducts, prodPage, prodSearch]);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    fetchProducts(prodPage, prodSearch);
  }

  // Toggle a single boolean flag (featured / bestSeller / surCommande / inStock)
  // straight from the product list. Optimistic UI: flip locally first, revert
  // if the server rejects the change.
  type Flag = "featured" | "bestSeller" | "surCommande" | "inStock";
  async function toggleFlag(productId: string, flag: Flag) {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const next = !target[flag];
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [flag]: next } : p)),
    );
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, [flag]: !next } : p)),
      );
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/backstage/login");
    router.refresh();
  }

  function handleEdit(product: Product) {
    setEditProduct(product);
    setTab("edit");
  }

  function handleSaved() {
    setTab("products");
    setEditProduct(null);
    fetchProducts(prodPage, prodSearch);
  }

  function getThumb(p: Product) {
    try {
      const imgs = JSON.parse(p.images) as string[];
      return imgs[0] || "";
    } catch { return ""; }
  }

  const totalProdPages = Math.ceil(totalProducts / prodLimit);

  async function handleStatusChange(orderId: string, newStatus: string) {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">Mebutik Sports Management</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {([
          { key: "products" as Tab, icon: Package, label: `Products (${totalProducts})` },
          { key: "add" as Tab, icon: Plus, label: "Add Product" },
          { key: "orders" as Tab, icon: ShoppingCart, label: "Orders" },
          { key: "reviews" as Tab, icon: Star, label: "Reviews" },
          { key: "stats" as Tab, icon: BarChart3, label: "Stats" },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (key === "add") setEditProduct(null);
              if (key === "orders") fetchOrders();
              setTab(key);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              tab === key ? "bg-orange-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {tab === "reviews" && <ReviewsAdmin />}

      {/* Products list */}
      {tab === "products" && (
        <div>
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); setProdPage(1); }}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition"
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              Page {prodPage} of {totalProdPages || 1}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No products found</p>
              <button onClick={() => setTab("add")} className="text-orange-500 hover:underline text-sm mt-2">
                Add your first product
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const thumb = getThumb(p);
                return (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 sm:px-4 sm:py-3 hover:border-orange-200 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg bg-gray-50 overflow-hidden shrink-0">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {p.team.league.name} · {p.team.name} · {p.price} MAD
                        </p>
                      </div>
                    </div>

                    {/* Quick toggles — click to flip the flag without entering the form */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <FlagToggle
                        active={p.featured}
                        onClick={() => toggleFlag(p.id, "featured")}
                        label="Featured"
                        activeColor="bg-blue-500 text-white border-blue-500"
                        idleColor="bg-blue-50 text-blue-500 border-blue-100 hover:border-blue-300"
                      />
                      <FlagToggle
                        active={p.bestSeller}
                        onClick={() => toggleFlag(p.id, "bestSeller")}
                        label="Best Seller"
                        activeColor="bg-green-600 text-white border-green-600"
                        idleColor="bg-green-50 text-green-600 border-green-100 hover:border-green-300"
                      />
                      <FlagToggle
                        active={p.surCommande}
                        onClick={() => toggleFlag(p.id, "surCommande")}
                        label="Pre-Order"
                        activeColor="bg-orange-500 text-white border-orange-500"
                        idleColor="bg-orange-50 text-orange-500 border-orange-100 hover:border-orange-300"
                      />
                      <FlagToggle
                        active={p.inStock}
                        onClick={() => toggleFlag(p.id, "inStock")}
                        label={p.inStock ? "In Stock" : "Out"}
                        activeColor="bg-gray-900 text-white border-gray-900"
                        idleColor="bg-red-50 text-red-500 border-red-100 hover:border-red-300"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto border-l border-gray-100 sm:pl-2 pt-2 sm:pt-0">
                      <a
                        href={`/product/${p.slug}`}
                        target="_blank"
                        className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                        title="View on site"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalProdPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setProdPage(Math.max(1, prodPage - 1))}
                disabled={prodPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-gray-500">
                {prodPage} / {totalProdPages}
              </span>
              <button
                onClick={() => setProdPage(Math.min(totalProdPages, prodPage + 1))}
                disabled={prodPage === totalProdPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product */}
      {(tab === "add" || tab === "edit") && (
        <ProductForm
          key={editProduct?.id || "new"}
          teams={teams}
          product={editProduct}
          onSaved={handleSaved}
          onCancel={() => { setTab("products"); setEditProduct(null); }}
        />
      )}

      {/* Orders */}
      {tab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerPhone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <p className="text-sm font-bold">{order.total} MAD</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {order.items.map((item) => (
                      <p key={item.id}>
                        {item.quantity}x {item.product.name} (Size: {item.size}) — {item.price * item.quantity} MAD
                      </p>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {tab === "stats" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-xs text-gray-500 mt-1">Total Products</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{teams.length}</p>
            <p className="text-xs text-gray-500 mt-1">Teams</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            <p className="text-xs text-gray-500 mt-1">Orders</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {new Set(teams.map(t => t.league.id)).size}
            </p>
            <p className="text-xs text-gray-500 mt-1">Leagues</p>
          </div>
        </div>
      )}
    </div>
  );
}
