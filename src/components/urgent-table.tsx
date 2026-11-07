import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle2, MessageSquareText, Truck, Upload, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { RenewDocDialog } from "@/components/renew-doc-dialog";
import { sendReminder } from "@/components/doc-actions";
import { describeDays } from "@/lib/compliance";
import type { EnrichedDoc, FleetData } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export function UrgentTable({ docs, data }: { docs: EnrichedDoc[]; data: FleetData }) {
  const [renewing, setRenewing] = useState<EnrichedDoc | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success-foreground">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-4 text-lg font-bold">All clear</h3>
        <p className="mt-1 text-sm text-muted-foreground">Nothing is expired or expiring in the next 30 days.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3">Driver / Unit</th>
              <th className="px-3 py-3">Document</th>
              <th className="px-3 py-3">Expires</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => {
              const red = doc.status === "expired" || doc.status === "missing";
              return (
                <tr key={doc.id} className="group border-b border-border/70 transition-colors last:border-0 hover:bg-muted/60">
                  <td className="px-6 py-4">
                    {doc.ownerKind === "driver" ? (
                      <Link
                        to="/drivers/$driverId"
                        params={{ driverId: doc.ownerId }}
                        className="flex items-center gap-3 font-semibold hover:text-primary"
                      >
                        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                          <UserRound className="size-4" />
                        </span>
                        {doc.ownerName}
                      </Link>
                    ) : (
                      <Link
                        to="/trucks/$vehicleId"
                        params={{ vehicleId: doc.ownerId }}
                        className="flex items-center gap-3 font-semibold hover:text-primary"
                      >
                        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                          <Truck className="size-4" />
                        </span>
                        {doc.ownerName}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-4 font-medium">{doc.label}</td>
                  <td className="px-3 py-4">
                    <p className={cn("font-semibold", red ? "text-danger-foreground" : "text-warning-foreground")}>
                      {describeDays(doc.days)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {doc.expires_on ? format(new Date(doc.expires_on + "T00:00:00"), "MMM d, yyyy") : "—"}
                    </p>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={doc.status} size="sm" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="surface"
                        disabled={sending === doc.id}
                        onClick={async () => {
                          setSending(doc.id);
                          await sendReminder(doc, data);
                          setSending(null);
                        }}
                      >
                        <MessageSquareText /> Send Reminder
                      </Button>
                      <Button size="sm" variant="signal" onClick={() => setRenewing(doc)}>
                        <Upload /> Upload New
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RenewDocDialog doc={renewing} onOpenChange={(o) => !o && setRenewing(null)} />
    </>
  );
}
