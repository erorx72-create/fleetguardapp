import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { AddDriverDialog } from "@/components/add-driver-dialog";
import { EntityCard, InitialsAvatar } from "@/components/entity-card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleet } from "@/hooks/use-fleet";
import { DRIVER_DOC_TYPES } from "@/lib/compliance";
import { docsFor, ownerStatus } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/_shell/drivers/")({
  head: () => ({
    meta: [
      { title: "Drivers (DQF) — FleetGuard" },
      { name: "description", content: "Driver qualification files with CDL, medical card, MVR and drug test tracking." },
      { property: "og:title", content: "Drivers (DQF) — FleetGuard" },
      { property: "og:description", content: "Driver qualification files with CDL, medical card, MVR and drug test tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriversPage,
});

function DriversPage() {
  const { data, isLoading } = useFleet();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Drivers · DQF"
        title="Driver qualification files"
        description="CDL, DOT medical card, MVR and Clearinghouse — one card per driver."
        actions={<AddDriverDialog />}
      />
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : data.drivers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No drivers yet"
          body="Add your first driver to start their qualification file."
          action={<AddDriverDialog />}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.drivers.map((d, i) => {
            const docs = docsFor(data, d.id).sort(
              (a, b) => DRIVER_DOC_TYPES.indexOf(a.doc_type) - DRIVER_DOC_TYPES.indexOf(b.doc_type),
            );
            return (
              <Link key={d.id} to="/drivers/$driverId" params={{ driverId: d.id }}>
                <EntityCard
                  avatar={<InitialsAvatar name={d.full_name} />}
                  title={d.full_name}
                  subtitle={
                    <>
                      {d.phone ?? "No phone"}
                      {d.hire_date && ` · Hired ${format(new Date(d.hire_date + "T00:00:00"), "MMM yyyy")}`}
                    </>
                  }
                  status={ownerStatus(data, d.id)}
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
