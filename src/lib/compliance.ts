import type { Database } from "@/integrations/supabase/types";

export type DocType = Database["public"]["Enums"]["doc_type"];
export type ComplianceStatus = "compliant" | "expiring" | "expired" | "missing";

export const DRIVER_DOC_TYPES: DocType[] = ["cdl", "medical_card", "mvr", "drug_test"];
export const VEHICLE_DOC_TYPES: DocType[] = ["annual_inspection", "registration", "insurance"];

export const DOC_LABELS: Record<DocType, string> = {
  cdl: "CDL License",
  medical_card: "DOT Medical Card",
  mvr: "MVR Report",
  drug_test: "Clearinghouse / Drug Test",
  annual_inspection: "Annual DOT Inspection",
  registration: "Cab Card / Registration",
  insurance: "Insurance Certificate",
};

export const DOC_HINTS: Record<DocType, string> = {
  cdl: "Commercial driver's license, front & back",
  medical_card: "Medical examiner's certificate (MEC)",
  mvr: "Annual motor vehicle record review",
  drug_test: "FMCSA Clearinghouse query or pre-employment test",
  annual_inspection: "49 CFR 396.17 periodic inspection",
  registration: "IRP cab card or state registration",
  insurance: "Certificate of liability insurance",
};

/** Days to expiration counted in whole calendar days (local time). */
export function daysUntil(expiresOn: string | null | undefined, today: Date = new Date()): number | null {
  if (!expiresOn) return null;
  const [y, m, d] = expiresOn.split("-").map(Number);
  const exp = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((exp - now) / 86_400_000);
}

/** Green > 30 days, Yellow 1–30 days, Red 0 or overdue. No date on file = missing (red). */
export function statusFromDays(days: number | null): ComplianceStatus {
  if (days === null) return "missing";
  if (days <= 0) return "expired";
  if (days <= 30) return "expiring";
  return "compliant";
}

export function docStatus(expiresOn: string | null | undefined, today?: Date): ComplianceStatus {
  return statusFromDays(daysUntil(expiresOn, today));
}

const SEVERITY: Record<ComplianceStatus, number> = {
  compliant: 0,
  expiring: 1,
  missing: 2,
  expired: 3,
};

/** The overall status of a driver/truck is its worst document. */
export function worstStatus(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.length === 0) return "missing";
  return statuses.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), "compliant" as ComplianceStatus);
}

export function isRed(s: ComplianceStatus) {
  return s === "expired" || s === "missing";
}

/** Fleet Safety Score: share of documents that are fully compliant (> 30 days), as a whole percent. */
export function safetyScore(statuses: ComplianceStatus[]): number {
  if (statuses.length === 0) return 100;
  const ok = statuses.filter((s) => s === "compliant").length;
  return Math.round((ok / statuses.length) * 100);
}

export function describeDays(days: number | null): string {
  if (days === null) return "No date on file";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export const STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  expiring: "Expiring Soon",
  expired: "Expired",
  missing: "Action Required",
};
