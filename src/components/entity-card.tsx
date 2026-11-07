import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge, StatusDot } from "@/components/status-badge";
import type { ComplianceStatus } from "@/lib/compliance";
import type { EnrichedDoc } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export function EntityCard({
  avatar,
  title,
  subtitle,
  status,
  docs,
  delay = 0,
}: {
  avatar: ReactNode;
  title: string;
  subtitle: ReactNode;
  status: ComplianceStatus;
  docs: EnrichedDoc[];
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "surface-card surface-interactive group flex h-full animate-rise flex-col p-5",
        (status === "expired" || status === "missing") && "border-danger/30",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-4">
        {avatar}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{title}</h3>
          <div className="truncate text-sm text-muted-foreground">{subtitle}</div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <StatusBadge status={status} size="sm" />
        <div className="flex items-center gap-2.5" aria-label="Document statuses">
          {docs.map((d) => (
            <span key={d.id} title={`${d.label}: ${d.status}`}>
              <StatusDot status={d.status} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-navy font-display text-base font-bold text-navy-foreground">
      {initials}
    </span>
  );
}
