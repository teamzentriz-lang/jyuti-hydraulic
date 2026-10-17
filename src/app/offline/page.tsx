export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-signal">
          Offline
        </p>
        <h1 className="mt-3 text-3xl font-bold text-navy">
          You are currently offline
        </h1>
        <p className="mt-3 text-muted">
          Please reconnect to continue using Jyoti Hydraulic.
        </p>
      </div>
    </main>
  );
}
