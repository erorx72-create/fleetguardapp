import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Download, Printer, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleet } from "@/hooks/use-fleet";
import {
  DOC_LABELS,
  DRIVER_DOC_TYPES,
  STATUS_LABELS,
  VEHICLE_DOC_TYPES,
  isRed,
  safetyScore,
  type DocType,
} from "@/lib/compliance";
import { docsFor, ownerStatus, vehicleName, type EnrichedDoc, type FleetData } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/audit")({
  head: () => ({
    meta: [
      { title: "DOT Audit Report — FleetGuard" },
      { name: "description", content: "Printable fleet compliance summary with Fleet Safety Score." },
      { property: "og:title", content: "DOT Audit Report — FleetGuard" },
      { property: "og:description", content: "Printable fleet compliance summary with Fleet Safety Score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

function fmt(d: string | null) {
  return d ? format(new Date(d + "T00:00:00"), "MM/dd/yyyy") : "—";
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const tone = score >= 90 ? "text-success" : score >= 70 ? "text-warning" : "text-danger";
  return (
    <div className="relative size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className={cn("fill-none stroke-current transition-all duration-1000", tone)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold">{score}%</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Safety Score</span>
      </div>
    </div>
  );
}

function csvFor(data: FleetData, companyName: string) {
  const rows = [["Company", "Type", "Name / Unit", "Document", "Expires", "Days left", "Status", "File on record"]];
  for (const d of [...data.documents].sort((a, b) => a.ownerName.localeCompare(b.ownerName))) {
    rows.push([
      companyName,
      d.ownerKind === "driver" ? "Driver" : "Equipment",
      d.ownerName,
      d.label,
      d.expires_on ?? "",
      d.days === null ? "" : String(d.days),
      STATUS_LABELS[d.status],
      d.file_name ? "Yes" : "No",
    ]);
  }
  return rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function DocCell({ doc }: { doc?: EnrichedDoc }) {
  if (!doc) return <td className="px-3 py-3 text-muted-foreground">—</td>;
  return (
    <td className="px-3 py-3">
      <StatusBadge status={doc.status} size="sm" label={doc.status === "compliant" ? "OK" : undefined} />
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{fmt(doc.expires_on)}</p>
    </td>
  );
}

function AuditPage() {
  const { data, isLoading, company } = useFleet();
  if (isLoading || !company) return <Skeleton className="h-[600px] rounded-xl" />;

  const statuses = data.documents.map((d) => d.status);
  const score = safetyScore(statuses);
  const compliant = statuses.filter((s) => s === "compliant").length;
  const expiring = statuses.filter((s) => s === "expiring").length;
  const red = statuses.filter(isRed).length;

  function download() {
    const blob = new Blob([csvFor(data, company!.name)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company!.name.replace(/\W+/g, "-")}-DOT-audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const docMap = (ownerId: string) => {
    const m = new Map<DocType, EnrichedDoc>();
    docsFor(data, ownerId).forEach((d) => m.set(d.doc_type, d));
    return m;
  };

  return (
    <div className="space-y-6">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">DOT Audit Report</p>
          <p className="mt-1 text-sm text-muted-foreground">Print it or save as PDF for a roadside or compliance review.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="surface" size="lg" onClick={download}>
            <Download /> Export CSV
          </Button>
          <Button variant="signal" size="lg" onClick={() => window.print()}>
            <Printer /> Print / Save PDF
          </Button>
        </div>
      </div>

      <article className="surface-card print-flat animate-rise overflow-hidden">
        <header className="flex flex-col gap-6 border-b border-border bg-muted/40 p-8 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <BrandMark />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Fleet Compliance Summary
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold">{company.name}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {company.dot_number ?? "USDOT # not on file"} · Generated {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge status="compliant" label={`${compliant} compliant`} />
              <StatusBadge status="expiring" label={`${expiring} expiring ≤30 days`} />
              <StatusBadge status="expired" label={`${red} expired / missing`} />
            </div>
          </div>
          <ScoreRing score={score} />
        </header>

        <section className="p-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            Drivers <span className="text-sm font-medium text-muted-foreground">({data.drivers.length})</span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Driver</th>
                  {DRIVER_DOC_TYPES.map((t) => (
                    <th key={t} className="px-3 py-2">{DOC_LABELS[t]}</th>
                  ))}
                  <th className="px-3 py-2">Overall</th>
                </tr>
              </thead>
              <tbody>
                {data.drivers.map((d) => {
                  const m = docMap(d.id);
                  return (
                    <tr key={d.id} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-semibold">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">Hired {fmt(d.hire_date)}</p>
                      </td>
                      {DRIVER_DOC_TYPES.map((t) => (
                        <DocCell key={t} doc={m.get(t)} />
                      ))}
                      <td className="px-3 py-3">
                        <StatusBadge status={ownerStatus(data, d.id)} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-border p-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            Trucks & Trailers <span className="text-sm font-medium text-muted-foreground">({data.vehicles.length})</span>
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Unit</th>
                  {VEHICLE_DOC_TYPES.map((t) => (
                    <th key={t} className="px-3 py-2">{DOC_LABELS[t]}</th>
                  ))}
                  <th className="px-3 py-2">Overall</th>
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map((v) => {
                  const m = docMap(v.id);
                  return (
                    <tr key={v.id} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-3">
                        <p className="font-semibold">{vehicleName(v)}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{v.vin ?? "No VIN"}</p>
                      </td>
                      {VEHICLE_DOC_TYPES.map((t) => (
                        <DocCell key={t} doc={m.get(t)} />
                      ))}
                      <td className="px-3 py-3">
                        <StatusBadge status={ownerStatus(data, v.id)} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex items-center gap-2 border-t border-border bg-muted/40 px-8 py-4 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Fleet Safety Score = share of tracked documents valid for more than 30 days. Generated by FleetGuard.
        </footer>
      </article>
    </div>
  );
}
