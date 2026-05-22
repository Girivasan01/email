export default function Spinner({ label = 'Loading' }) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
