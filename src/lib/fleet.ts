import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  DOC_LABELS,
  daysUntil,
  statusFromDays,
  worstStatus,
  type ComplianceStatus,
  type DocType,
} from "@/lib/compliance";

export type Company = Tables<"companies">;
export type Driver = Tables<"drivers">;
export type Vehicle = Tables<"vehicles">;
export type FleetDocument = Tables<"documents">;

export type EnrichedDoc = FleetDocument & {
  days: number | null;
  status: ComplianceStatus;
  label: string;
  ownerName: string;
  ownerKind: "driver" | "vehicle";
  ownerId: string;
};

export type FleetData = {
  drivers: Driver[];
  vehicles: Vehicle[];
  documents: EnrichedDoc[];
};

export const companiesQuery = () =>
  queryOptions({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

export function vehicleName(v: Pick<Vehicle, "kind" | "unit_number">) {
  return `${v.kind === "trailer" ? "Trailer" : "Truck"} #${v.unit_number}`;
}

export const fleetQuery = (companyId: string) =>
  queryOptions({
    queryKey: ["fleet", companyId],
    queryFn: async (): Promise<FleetData> => {
      const [drivers, vehicles, documents] = await Promise.all([
        supabase.from("drivers").select("*").eq("company_id", companyId).order("full_name"),
        supabase.from("vehicles").select("*").eq("company_id", companyId).order("unit_number"),
        supabase.from("documents").select("*").eq("company_id", companyId),
      ]);
      if (drivers.error) throw drivers.error;
      if (vehicles.error) throw vehicles.error;
      if (documents.error) throw documents.error;

      const driverMap = new Map(drivers.data.map((d) => [d.id, d]));
      const vehicleMap = new Map(vehicles.data.map((v) => [v.id, v]));

      const enriched: EnrichedDoc[] = documents.data.map((doc) => {
        const days = daysUntil(doc.expires_on);
        const driver = doc.driver_id ? driverMap.get(doc.driver_id) : undefined;
        const vehicle = doc.vehicle_id ? vehicleMap.get(doc.vehicle_id) : undefined;
        return {
          ...doc,
          days,
          status: statusFromDays(days),
          label: DOC_LABELS[doc.doc_type as DocType],
          ownerKind: driver ? "driver" : "vehicle",
          ownerId: driver?.id ?? vehicle?.id ?? "",
          ownerName: driver ? driver.full_name : vehicle ? vehicleName(vehicle) : "Unknown",
        };
      });

      return { drivers: drivers.data, vehicles: vehicles.data, documents: enriched };
    },
  });

export function docsFor(data: FleetData, ownerId: string) {
  return data.documents.filter((d) => d.ownerId === ownerId);
}

export function ownerStatus(data: FleetData, ownerId: string): ComplianceStatus {
  return worstStatus(docsFor(data, ownerId).map((d) => d.status));
}

/** Red & yellow items, closest expiration first (missing dates last among reds). */
export function urgentDocs(data: FleetData) {
  return data.documents
    .filter((d) => d.status !== "compliant")
    .sort((a, b) => (a.days ?? -100000) - (b.days ?? -100000));
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
}

export async function uploadDocumentFile(doc: FleetDocument, file: File) {
  const path = `${doc.company_id}/${doc.id}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw upErr;
  const { error } = await supabase
    .from("documents")
    .update({ file_path: path, file_name: file.name, uploaded_at: new Date().toISOString() })
    .eq("id", doc.id);
  if (error) throw error;
}

export async function openDocumentFile(path: string) {
  let result = await supabase.storage.from("documents").createSignedUrl(path, 60 * 10);
  if (result.error) result = await supabase.storage.from("document-uploads").createSignedUrl(path, 60 * 10);
  const { data, error } = result;
  if (error) throw error;
  if (!data) throw new Error("Document unavailable");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
