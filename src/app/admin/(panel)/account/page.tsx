import { Notice, PageHeader } from "@/components/admin/page-header";
import { AccountForm } from "@/components/admin/account-form";
import { requireUser } from "@/lib/auth";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  const user = await requireUser();

  return (
    <>
      <PageHeader eyebrow="Account" title={user.name} description={`${user.email} · ${user.systemRole.replace("_", " ")}`} />
      {params.saved ? <Notice tone="ok">Password updated.</Notice> : null}
      <AccountForm />
    </>
  );
}
