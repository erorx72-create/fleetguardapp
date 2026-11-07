import { createFileRoute, Link } from "@tanstack/react-router";
import { Container, Truck } from "lucide-react";
import { AddVehicleDialog } from "@/components/add-vehicle-dialog";
import { EntityCard } from "@/components/entity-card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleet } from "@/hooks/use-fleet";
import { VEHICLE_DOC_TYPES } from "@/lib/compliance";
import { docsFor, ownerStatus, vehicleName } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/_shell/trucks/")({
  head: () => ({
    meta: [
      { title: "Trucks & Trailers — FleetGuard" },
      { name: "description", content: "Annual inspections, registrations and insurance for every unit." },
      { property: "og:title", content: "Trucks & Trailers — FleetGuard" },
      { property: "og:description", content: "Annual inspections, registrations and insurance for every unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrucksPage,
});

export function VehicleAvatar({ kind }: { kind: string }) {
  const Icon = kind === "trailer" ? Container : Truck;
  return (
    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-navy text-navy-foreground">
      <Icon className="size-5" />
    </span>
  );
}

function TrucksPage() {
  const { data, isLoading } = useFleet();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Trucks & Trailers"
        title="Equipment compliance"
        description="Annual DOT inspection, cab card and insurance — tracked per unit."
        actions={<AddVehicleDialog />}
      />
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : data.vehicles.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-6" />}
          title="No units yet"
          body="Add your first truck or trailer to start tracking its paperwork."
          action={<AddVehicleDialog />}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.vehicles.map((v, i) => {
            const docs = docsFor(data, v.id).sort(
              (a, b) => VEHICLE_DOC_TYPES.indexOf(a.doc_type) - VEHICLE_DOC_TYPES.indexOf(b.doc_type),
            );
            return (
              <Link key={v.id} to="/trucks/$vehicleId" params={{ vehicleId: v.id }}>
                <EntityCard
                  avatar={<VehicleAvatar kind={v.kind} />}
                  title={vehicleName(v)}
                  subtitle={<span className="font-mono text-xs">{v.plate ?? "No plate"} · {v.vin ?? "No VIN"}</span>}
                  status={ownerStatus(data, v.id)}
                  docs={docs}
                  delay={i * 0.04}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
