"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

export default function FilterSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="md:hidden w-full flex items-center justify-between gap-2 text-sm font-semibold border border-gray-200 rounded-xl px-4 py-3 mb-4 bg-white hover:border-orange-300 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-500" />
          Filters
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <div className={`${open ? "block" : "hidden"} md:block`}>
        {children}
      </div>
    </>
  );
}
