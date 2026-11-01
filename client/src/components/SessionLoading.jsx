export default function SessionLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div role="status" className="flex items-center gap-3 text-ink-muted">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent-support motion-reduce:animate-none" />
        <span className="text-[15px]">Restoring your session…</span>
      </div>
    </div>
  );
}