import { Clock, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  hoursRemaining: number;
  onUpgrade: () => void;
}

export function TrialBanner({ hoursRemaining, onUpgrade }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const totalMinutes = Math.max(0, Math.round(hoursRemaining * 60));
    setMinutes(totalMinutes);

    const timer = setInterval(() => {
      setMinutes((prev) => Math.max(0, prev - 1));
    }, 60_000);

    return () => clearInterval(timer);
  }, [hoursRemaining]);

  if (dismissed || minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const isCritical = hours < 24;

  return (
    <div
      className={cn(
        "print:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 text-sm backdrop-blur-xl md:px-6",
        isCritical
          ? "border-b border-danger/30 bg-danger-soft/95 text-danger-foreground"
          : "border-b border-warning/30 bg-warning-soft/95 text-warning-foreground",
      )}
    >
      <Clock className={cn("size-4 shrink-0", isCritical ? "text-danger-foreground" : "text-warning-foreground")} />
      <p className="flex-1 font-medium">
        Your Free Trial Expires in{" "}
        <span className="font-bold">
          {hours} Hour{hours === 1 ? "" : "s"}, {mins} Minute{mins === 1 ? "" : "s"}
        </span>
        . Upgrade to Premium now to guarantee uninterrupted DOT Compliance &amp; prevent automated account lock.
      </p>
      <Button
        size="sm"
        variant={isCritical ? "destructive" : "signal"}
        className="shrink-0"
        onClick={onUpgrade}
      >
        Upgrade Now <ArrowRight />
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className={cn(
          "shrink-0 rounded-md p-1 transition-colors",
          isCritical ? "hover:bg-danger/15" : "hover:bg-warning/15",
        )}
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
