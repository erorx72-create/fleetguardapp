import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type ComplianceStatus } from "@/lib/compliance";

const badge = cva(
  "inline-flex items-center gap-2 whitespace-nowrap rounded-full border font-semibold tracking-tight",
  {
    variants: {
      status: {
        compliant: "border-success/25 bg-success-soft text-success-foreground",
        expiring: "border-warning/35 bg-warning-soft text-warning-foreground",
        expired: "border-danger/25 bg-danger-soft text-danger-foreground",
        missing: "border-danger/25 bg-danger-soft text-danger-foreground",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[11px]",
        md: "px-3 py-1 text-xs",
        lg: "px-3.5 py-1.5 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const dot = cva("relative inline-flex size-2 rounded-full", {
  variants: {
    status: {
      compliant: "bg-success glow-success",
      expiring: "bg-warning glow-warning",
      expired: "bg-danger glow-danger",
      missing: "bg-danger glow-danger",
    },
  },
});

export function StatusDot({ status, className }: { status: ComplianceStatus; className?: string }) {
  const red = status === "expired" || status === "missing";
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)}>
      {red && (
        <span className="absolute inset-0 rounded-full bg-danger animate-status-pulse" aria-hidden />
      )}
      <span className={dot({ status })} />
    </span>
  );
}

export function StatusBadge({
  status,
  size,
  label,
  className,
}: {
  status: ComplianceStatus;
  size?: "sm" | "md" | "lg" | undefined;
  label?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span className={cn(badge({ status, size }), className)}>
      <StatusDot status={status} />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
