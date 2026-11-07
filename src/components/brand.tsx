import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl bg-gradient-signal text-primary-foreground shadow-glow",
        className,
      )}
    >
      <ShieldCheck className="size-5" strokeWidth={2.4} />
    </span>
  );
}

export function Brand({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          light ? "text-navy-foreground" : "text-foreground",
        )}
      >
        FleetGuard
      </span>
    </span>
  );
}
