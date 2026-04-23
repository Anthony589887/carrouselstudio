type Status = "draft" | "ready" | "generated" | "posted";

const styles: Record<Status, string> = {
  draft: "bg-neutral-800 text-neutral-400",
  ready: "bg-blue-500/15 text-blue-300",
  generated: "bg-orange-500/15 text-orange-300",
  posted: "bg-emerald-500/15 text-emerald-300",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
