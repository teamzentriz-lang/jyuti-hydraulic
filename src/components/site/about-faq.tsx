"use client";

import { useEffect, useRef } from "react";

export function AboutFaq({ items }: { items: { title: string; body: string }[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll("details")];
    const onToggle = (event: Event) => {
      const current = event.currentTarget;
      if (!(current instanceof HTMLDetailsElement) || !current.open) return;
      items.forEach((other) => {
        if (other !== current) other.open = false;
      });
    };
    items.forEach((item) => item.addEventListener("toggle", onToggle));
    return () => items.forEach((item) => item.removeEventListener("toggle", onToggle));
  }, []);

  return (
    <div ref={rootRef} className="about-faq flex flex-col gap-3">
      {items.map((item, index) => (
        <details
          key={item.title}
          className="group bg-[#e7eef6] open:border-l-[3px] open:border-[#19a4c8] open:bg-white open:shadow-[0_10px_28px_rgba(15,40,70,0.08)]"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <summary className="relative flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 group-open:px-6 group-open:pb-2 group-open:pt-5 group-open:pr-16 [&::-webkit-details-marker]:hidden">
            <h3 className="text-[15px] font-semibold text-[#2456a6] group-open:text-lg group-open:font-bold group-open:text-[#e31c23]">
              {item.title}
            </h3>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#9aa8b8] shadow-sm group-open:absolute group-open:right-4 group-open:top-4 group-open:h-10 group-open:w-10 group-open:bg-[#10243f] group-open:text-white group-open:shadow-none">
              <svg viewBox="0 0 20 20" className="h-4 w-4 group-open:rotate-90" aria-hidden="true">
                <path
                  d="M7.5 4.5 13 10l-5.5 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </summary>
          <p className="px-6 pb-6 text-[15px] leading-7 text-[#4d5b6b]">{item.body}</p>
        </details>
      ))}
    </div>
  );
}
