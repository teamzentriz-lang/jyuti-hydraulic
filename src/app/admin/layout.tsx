import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Content studio",
    template: "%s · Jyoti Hydraulic",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
