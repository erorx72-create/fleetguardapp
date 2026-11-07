import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { UrgentTable } from "@/components/urgent-table";
import { StatusDot } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleet } from "@/hooks/use-fleet";
import { isRed } from "@/lib/compliance";
import { urgentDocs } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/alerts")({
  head: () => ({
    meta: [
      { title: "Urgent Alerts — FleetGuard" },
      { name: "description", content: "Every expired and expiring DOT document in one list." },
      { property: "og:title", content: "Urgent Alerts — FleetGuard" },
      { property: "og:description", content: "Every expired and expiring DOT document in one list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

type Filter = "all" | "red" | "yellow";

function AlertsPage() {
  const { data, isLoading } = useFleet();
  const [filter, setFilter] = useState<Filter>("all");
  const all = urgentDocs(data);
  const red = all.filter((d) => isRed(d.status));
  const yellow = all.filter((d) => d.status === "expiring");
  const shown = filter === "red" ? red : filter === "yellow" ? yellow : all;

  const tabs: { id: Filter; label: string; count: number; dot?: "expired" | "expiring" }[] = [
    { id: "all", label: "All open", count: all.length },
    { id: "red", label: "Expired / Action Required", count: red.length, dot: "expired" },
    { id: "yellow", label: "Expiring Soon", count: yellow.length, dot: "expiring" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Urgent Alerts"
        title="Expiring & expired"
        description="Send a reminder in one click, or upload the renewed document yourself."
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
              filter === t.id
                ? "border-foreground bg-foreground text-background shadow-card"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t.dot && <StatusDot status={t.dot} />}
            {t.label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{t.count}</span>
          </button>
        ))}
      </div>
      <section className="surface-card animate-rise overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <UrgentTable docs={shown} data={data} />
        )}
      </section>
    </div>
  );
}
