"use client";

import { useEffect, useRef } from "react";

interface StaggerGridProps {
  children: React.ReactNode;
  className: string;
  triggerKey?: string | number;
  delay?: number;
}

export default function StaggerGrid({ children, className, triggerKey, delay = 80 }: StaggerGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = Array.from(el.children) as HTMLElement[];
    items.forEach((item) => {
      item.classList.remove("revealed");
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          items.forEach((item, i) => {
            setTimeout(() => {
              item.classList.add("revealed");
            }, i * delay);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerKey, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
