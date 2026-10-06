import { redirect } from "next/navigation";
import { DatabaseSetup } from "@/components/admin/database-setup";
import { LoginForm } from "@/components/admin/login-form";
import { getCurrentUser } from "@/lib/auth";
import { countUsers, loadDatabase } from "@/lib/cms/queries";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/admin") && !params.next.startsWith("//") ? params.next : "/admin/";
  const loaded = await loadDatabase(async () => {
    const [user, total] = await Promise.all([getCurrentUser(), countUsers()]);
    return { user, total };
  });

  if (!loaded.ok) return <DatabaseSetup failure={loaded.failure} />;
  if (loaded.data.user) redirect("/admin/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal">Jyoti Hydraulic</p>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Editors use this studio. The public site reads the same database.</p>
        <LoginForm next={next} needsSeed={loaded.data.total === 0} />
      </div>
    </main>
  );
}
