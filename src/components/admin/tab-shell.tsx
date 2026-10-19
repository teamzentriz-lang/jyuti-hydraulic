"use client";

import { useState } from "react";

export function TabShell({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rounded-t-md px-3 py-2 text-sm font-semibold ${active === tab.id ? "bg-white text-navy shadow-sm" : "text-muted hover:text-navy"}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.map((tab) => (
          <div key={tab.id} hidden={tab.id !== active}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
