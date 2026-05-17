import Link from "next/link";
import { SIZES } from "@/lib/leagues-data";

/**
 * Size multi-select chips for league/team pages.
 *
 * Stateless: renders the canonical size list and resolves the next href
 * for each chip via `buildHref`. Active sizes are filled, idle ones are
 * outlined. Used on /league/[slug] and /team/[slug] alongside the in-page
 * product grid so the customer never has to leave the page to filter.
 */
export default function SizeFilterPills({
  selectedSizes,
  buildHref,
  clearHref,
  className = "",
}: {
  selectedSizes: string[];
  buildHref: (nextSizes: string[]) => string;
  clearHref: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mr-1">
        Size
      </span>
      {SIZES.map((size) => {
        const active = selectedSizes.includes(size);
        const next = active
          ? selectedSizes.filter((s) => s !== size)
          : [...selectedSizes, size];
        return (
          <Link
            key={size}
            href={buildHref(next)}
            className={`min-w-[2.25rem] text-center text-xs font-bold border rounded-lg px-2.5 py-1.5 transition ${
              active
                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500"
            }`}
          >
            {size}
          </Link>
        );
      })}
      {selectedSizes.length > 0 && (
        <Link
          href={clearHref}
          className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 hover:underline ml-1"
        >
          Clear
        </Link>
      )}
    </div>
  );
}
