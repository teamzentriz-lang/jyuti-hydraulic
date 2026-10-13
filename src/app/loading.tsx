export default function Loading() {
  return (
    <div className="route-loading-state" role="status" aria-live="polite">
      <span className="route-loading-state__spinner" aria-hidden="true" />
      <span>Loading page...</span>
    </div>
  );
}
