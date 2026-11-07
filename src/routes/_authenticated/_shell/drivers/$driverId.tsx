import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/delete-button";
import { DocCard } from "@/components/doc-card";
import { InitialsAvatar } from "@/components/entity-card";
import { MagicLinkDialog } from "@/components/magic-link-dialog";
import { EmptyState } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFleet, useInvalidateFleet } from "@/hooks/use-fleet";
import { DRIVER_DOC_TYPES } from "@/lib/compliance";
import { docsFor, ownerStatus } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/_shell/drivers/$driverId")({
  head: () => ({
    meta: [
      { title: "Driver file — FleetGuard" },
      { name: "description", content: "Driver qualification checklist with expiration tracking." },
      { property: "og:title", content: "Driver file — FleetGuard" },
      { property: "og:description", content: "Driver qualification checklist with expiration tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriverPage,
});

function DriverPage() {
  const { driverId } = Route.useParams();
  const { data, isLoading } = useFleet();
  const invalidate = useInvalidateFleet();
  const navigate = useNavigate();
  const driver = data.drivers.find((d) => d.id === driverId);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!driver)
    return (
      <EmptyState
        icon={<ArrowLeft className="size-6" />}
        title="Driver not found"
        body="They may belong to another company. Switch companies or go back to the list."
        action={
          <Link to="/drivers" className="font-semibold text-primary">
            Back to drivers
          </Link>
        }
      />
    );

  const docs = docsFor(data, driver.id).sort(
    (a, b) => DRIVER_DOC_TYPES.indexOf(a.doc_type) - DRIVER_DOC_TYPES.indexOf(b.doc_type),
  );
  const status = ownerStatus(data, driver.id);

  async function remove() {
    const { error } = await supabase.from("drivers").delete().eq("id", driverId);
    if (error) return toast.error("Could not remove driver");
    toast.success("Driver removed");
    await invalidate();
    navigate({ to: "/drivers" });
  }

  return (
    <div className="space-y-8">
      <Link to="/drivers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All drivers
      </Link>

      <div className="surface-card flex animate-rise flex-col gap-6 p-6 md:flex-row md:items-center">
        <InitialsAvatar name={driver.full_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold">{driver.full_name}</h1>
            <StatusBadge status={status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {driver.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {driver.phone}
              </span>
            )}
            {driver.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5" /> {driver.email}
              </span>
            )}
            {driver.hire_date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Hired {format(new Date(driver.hire_date + "T00:00:00"), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <MagicLinkDialog driver={driver} />
          <DeleteButton what={driver.full_name} onConfirm={remove} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold">DQF checklist</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {docs.filter((d) => d.status === "compliant").length} of {docs.length} documents compliant
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {docs.map((doc, i) => (
          <DocCard key={doc.id} doc={doc} delay={i * 0.05} />
        ))}
      </div>
    </div>
  );
}
