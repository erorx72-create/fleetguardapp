import type { LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tone = cva("inline-flex size-11 items-center justify-center rounded-xl", {
  variants: {
    tone: {
      neutral: "bg-accent text-primary",
      warning: "bg-warning-soft text-warning-foreground",
      danger: "bg-danger-soft text-danger-foreground",
    },
  },
});

const bar = cva("absolute inset-x-0 top-0 h-1 rounded-t-xl", {
  variants: {
    tone: {
      neutral: "bg-gradient-signal",
      warning: "bg-warning",
      danger: "bg-danger",
    },
  },
});

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone: t = "neutral",
  delay = 0,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone?: "neutral" | "warning" | "danger";
  delay?: number;
}) {
  return (
    <div
      className="surface-card surface-interactive relative animate-rise overflow-hidden p-6"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={bar({ tone: t })} />
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <span className={tone({ tone: t })}>
          <Icon className="size-5" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-display text-5xl font-extrabold tracking-tight",
          t === "warning" && "text-warning-foreground",
          t === "danger" && "text-danger-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
