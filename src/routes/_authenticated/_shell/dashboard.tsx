import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertOctagon, ArrowRight, Clock, Truck, Users } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { UrgentTable } from "@/components/urgent-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleet } from "@/hooks/use-fleet";
import { isRed, safetyScore } from "@/lib/compliance";
import { urgentDocs } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center — FleetGuard" },
      { name: "description", content: "Live DOT compliance overview for your fleet." },
      { property: "og:title", content: "Command Center — FleetGuard" },
      { property: "og:description", content: "Live DOT compliance overview for your fleet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, company } = useFleet();
  const expiring = data.documents.filter((d) => d.status === "expiring").length;
  const critical = data.documents.filter((d) => isRed(d.status)).length;
  const urgent = urgentDocs(data);
  const score = safetyScore(data.documents.map((d) => d.status));
  const trucks = data.vehicles.filter((v) => v.kind === "truck").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command Center"
        title={company ? company.name : "Loading…"}
        description={
          critical > 0
            ? `${critical} item${critical === 1 ? " needs" : "s need"} action now. Clear the red first.`
            : expiring > 0
              ? `No violations — ${expiring} item${expiring === 1 ? "" : "s"} expiring within 30 days.`
              : "Every driver and unit is compliant. Nice work."
        }
        actions={
          <Link
            to="/audit"
            className="surface-card surface-interactive flex items-center gap-4 px-5 py-3"
          >
            <span className="text-right">
              <span className="block text-xs font-semibold text-muted-foreground">Fleet Safety Score</span>
              <span
                className={cn(
                  "font-display text-2xl font-extrabold",
                  score >= 90 ? "text-success-foreground" : score >= 70 ? "text-warning-foreground" : "text-danger-foreground",
                )}
              >
                {isLoading ? "—" : `${score}%`}
              </span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : (
          <>
            <KpiCard label="Total Active Trucks" value={trucks} hint={`${data.vehicles.length} units incl. trailers`} icon={Truck} delay={0} />
            <KpiCard label="Total Drivers" value={data.drivers.length} hint="Driver qualification files" icon={Users} delay={0.05} />
            <KpiCard label="Expiring in 30 Days" value={expiring} hint="Renew before they turn red" icon={Clock} tone="warning" delay={0.1} />
            <KpiCard label="Critical / Expired" value={critical} hint="Out of compliance today" icon={AlertOctagon} tone="danger" delay={0.15} />
          </>
        )}
      </div>

      <section className="surface-card animate-rise overflow-hidden" style={{ animationDelay: "0.2s" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <h2 className="flex items-center gap-3 text-xl font-bold">
              Urgent Action Required
              {urgent.length > 0 && (
                <StatusBadge status={critical > 0 ? "expired" : "expiring"} size="sm" label={`${urgent.length} open`} />
              )}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Red and yellow items, closest expiration first.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/alerts">
              View all alerts <ArrowRight />
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <UrgentTable docs={urgent.slice(0, 8)} data={data} />
        )}
      </section>
    </div>
  );
}
