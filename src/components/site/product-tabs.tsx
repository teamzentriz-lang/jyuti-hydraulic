"use client";

import { useState } from "react";

export function ProductTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div className="product-tabs">
      {tabs.length > 1 ? (
        <div className="product-tabs__bar" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === current.id}
              className={tab.id === current.id ? "is-active" : ""}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="product-tabs__panel" role="tabpanel">
        {current.content}
      </div>
    </div>
  );
}
