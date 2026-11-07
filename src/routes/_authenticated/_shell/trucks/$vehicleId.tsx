import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/delete-button";
import { DocCard } from "@/components/doc-card";
import { VehicleAvatar } from "@/components/entity-card";
import { EmptyState } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFleet, useInvalidateFleet } from "@/hooks/use-fleet";
import { VEHICLE_DOC_TYPES } from "@/lib/compliance";
import { docsFor, ownerStatus, vehicleName } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/_shell/trucks/$vehicleId")({
  head: () => ({
    meta: [
      { title: "Unit file — FleetGuard" },
      { name: "description", content: "Inspection, registration and insurance checklist for one unit." },
      { property: "og:title", content: "Unit file — FleetGuard" },
      { property: "og:description", content: "Inspection, registration and insurance checklist for one unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VehiclePage,
});

function VehiclePage() {
  const { vehicleId } = Route.useParams();
  const { data, isLoading } = useFleet();
  const invalidate = useInvalidateFleet();
  const navigate = useNavigate();
  const vehicle = data.vehicles.find((v) => v.id === vehicleId);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!vehicle)
    return (
      <EmptyState
        icon={<ArrowLeft className="size-6" />}
        title="Unit not found"
        body="It may belong to another company. Switch companies or go back to the list."
        action={
          <Link to="/trucks" className="font-semibold text-primary">
            Back to trucks
          </Link>
        }
      />
    );

  const docs = docsFor(data, vehicle.id).sort(
    (a, b) => VEHICLE_DOC_TYPES.indexOf(a.doc_type) - VEHICLE_DOC_TYPES.indexOf(b.doc_type),
  );
  const name = vehicleName(vehicle);

  async function remove() {
    const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
    if (error) return toast.error("Could not remove unit");
    toast.success("Unit removed");
    await invalidate();
    navigate({ to: "/trucks" });
  }

  return (
    <div className="space-y-8">
      <Link to="/trucks" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All trucks & trailers
      </Link>

      <div className="surface-card flex animate-rise flex-col gap-6 p-6 md:flex-row md:items-center">
        <VehicleAvatar kind={vehicle.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold">{name}</h1>
            <StatusBadge status={ownerStatus(data, vehicle.id)} />
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VIN</dt>
              <dd className="font-mono">{vehicle.vin ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">License plate</dt>
              <dd className="font-mono">{vehicle.plate ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <DeleteButton what={name} onConfirm={remove} />
      </div>

      <div>
        <h2 className="text-xl font-bold">Equipment checklist</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {docs.filter((d) => d.status === "compliant").length} of {docs.length} documents compliant
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {docs.map((doc, i) => (
          <DocCard key={doc.id} doc={doc} delay={i * 0.05} />
        ))}
      </div>
    </div>
  );
}
