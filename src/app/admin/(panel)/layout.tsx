import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { DatabaseSetup } from "@/components/admin/database-setup";
import { getCurrentUser } from "@/lib/auth";
import { ensureSingletons, loadDatabase } from "@/lib/cms/queries";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const loaded = await loadDatabase(async () => {
    await ensureSingletons();
    return getCurrentUser();
  });

  if (!loaded.ok) return <DatabaseSetup failure={loaded.failure} />;
  if (!loaded.data) redirect("/admin/login/");

  return <AdminShell user={loaded.data}>{children}</AdminShell>;
}
