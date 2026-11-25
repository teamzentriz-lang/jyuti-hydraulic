"use client";

import { useSyncExternalStore } from "react";

type ProductTab = {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: string;
};

function TabIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: <path d="M4 19h16M6 16l4-5 3 2 5-7M6 5h.01M10 5h.01M14 5h.01M18 5h.01" />,
    specifications: <path d="M7 3h10v18H7zM9 7h6M9 11h6M9 15h4M4 6v12M20 6v12" />,
    features: <path d="M12 3l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.7 5.2-.8L12 3z" />,
    applications: <path d="M4 19V9l8-5 8 5v10h-6v-6h-4v6H4z" />,
    video: <path d="M4 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM17 10l5-3v10l-5-3" />,
    reviews: <path d="M12 3l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.7 5.2-.8L12 3z" />,
    faq: <path d="M9.5 9a2.6 2.6 0 1 1 4.6 1.7c-.9 1-2.1 1.4-2.1 3M12 18h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
    downloads: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4" />,
  };

  return (
    <svg
      className="product-tabs__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.overview}
    </svg>
  );
}

function subscribeToHashChange(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function ProductTabs({
  tabs,
}: {
  tabs: ProductTab[];
}) {
  const active = useSyncExternalStore(subscribeToHashChange,
    () => window.location.hash.replace(/^#product-tab-/, ""), () => "",
  );
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div className="product-tabs" id={tabs.length === 1 ? `product-tab-${current.id}` : undefined}>
      {tabs.length > 1 ? (
        <div className="product-tabs__bar" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`product-tab-${tab.id}`}
              role="tab"
              aria-selected={tab.id === current.id}
              aria-controls={`product-panel-${tab.id}`}
              className={tab.id === current.id ? "is-active" : ""}
              onClick={() => { window.location.hash = `product-tab-${tab.id}`; }}
            >
              {tab.icon ? <TabIcon name={tab.icon} /> : null}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="product-tabs__panel"
        id={`product-panel-${current.id}`}
        role="tabpanel"
        aria-labelledby={tabs.length > 1 ? `product-tab-${current.id}` : undefined}
        aria-label={tabs.length === 1 ? current.label : undefined}
        tabIndex={0}
      >
        {current.content}
      </div>
    </div>
  );
}
