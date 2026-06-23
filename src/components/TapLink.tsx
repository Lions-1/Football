"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * A Next.js <Link> drop-in that gives clear click feedback on both touch and
 * mouse: an instant press-down scale, and — because league pages load
 * dynamically — a persistent "selected" ring + spinner overlay that stays
 * until the destination page takes over.
 */
export default function TapLink({
  href,
  className = "",
  selectedClassName = "",
  children,
  ...rest
}: {
  href: string;
  className?: string;
  selectedClassName?: string;
  children: React.ReactNode;
  prefetch?: boolean;
  "aria-label"?: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Link
      href={href}
      onClick={() => setPressed(true)}
      aria-busy={pressed}
      className={`relative active:scale-[0.97] transition-transform duration-100 ${className} ${
        pressed ? selectedClassName : ""
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
      {...rest}
    >
      {children}
      {pressed && (
        <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[inherit] bg-orange-500/20 backdrop-blur-[1px]">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white border-t-transparent drop-shadow" />
        </span>
      )}
    </Link>
  );
}
