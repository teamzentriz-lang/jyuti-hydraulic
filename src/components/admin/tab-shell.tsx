"use client";

import { useState } from "react";

export function TabShell({
  tabs,
  stacked = false,
}: {
  tabs: { id: string; label: string; content: React.ReactNode; hidden?: boolean }[];
  stacked?: boolean;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  if (stacked) {
    return (
      <div className="space-y-6">
        {tabs
          .filter((tab) => !tab.hidden)
          .map((tab) => (
            <section key={tab.id} className="space-y-3">
              <div className="border-b border-line pb-2">
                <h2 className="text-lg font-bold text-navy">{tab.label}</h2>
              </div>
              {tab.content}
            </section>
          ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {tabs.filter((tab) => !tab.hidden).map((tab) => (
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
            {!tab.hidden ? tab.content : null}
          </div>
        ))}
      </div>
    </div>
  );
}
