import type { DatabaseFailure } from "@/db/errors";

const copy: Record<DatabaseFailure["reason"], { title: string; detail: string }> = {
  missing: {
    title: "Add the Postgres URL",
    detail: "The CMS is ready. It will connect as soon as DATABASE_URL is in .env.local.",
  },
  schema: {
    title: "Create the tables",
    detail: "Postgres answered, and the CMS tables are not there yet.",
  },
  auth: {
    title: "Postgres refused the login",
    detail: "Check the user, password, host, and database name in DATABASE_URL.",
  },
  offline: {
    title: "Postgres is not reachable",
    detail: "The URL is set, but the app could not open a connection.",
  },
};

export function DatabaseSetup({ failure }: { failure: DatabaseFailure }) {
  const state = copy[failure.reason];
  return (
    <main className="min-h-screen bg-paper px-4 py-16 text-ink">
      <div className="mx-auto max-w-2xl rounded-xl border border-line bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal">Jyoti Hydraulic CMS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">{state.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{state.detail}</p>
        <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm text-navy">{failure.message}</p>
        <ol className="mt-6 space-y-4 text-sm leading-6">
          <li>
            <span className="font-semibold text-navy">1. Create `.env.local`</span>
            <pre className="mt-2 overflow-x-auto rounded-md bg-navy px-3 py-2 text-xs text-white">copy .env.example .env.local</pre>
          </li>
          <li>
            <span className="font-semibold text-navy">2. Paste the database URL</span>
            <p className="mt-1 text-muted">Neon and Supabase both work. Use the pooled connection string and keep `sslmode=require`.</p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-navy px-3 py-2 text-xs text-white">DATABASE_URL=postgresql://USER:PASSWORD@HOST/jyoti_hydraulic?sslmode=require</pre>
          </li>
          <li>
            <span className="font-semibold text-navy">3. Create the tables and the first admin</span>
            <pre className="mt-2 overflow-x-auto rounded-md bg-navy px-3 py-2 text-xs text-white">{`npm run db:push\nnpm run db:seed`}</pre>
            <p className="mt-2 text-muted">Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` before the seed. The password needs at least 8 characters.</p>
          </li>
        </ol>
      </div>
    </main>
  );
}
