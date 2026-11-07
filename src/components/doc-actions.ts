import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EnrichedDoc, FleetData } from "@/lib/fleet";

export async function sendReminder(doc: EnrichedDoc, data: FleetData) {
  const driver = doc.driver_id ? data.drivers.find((d) => d.id === doc.driver_id) : undefined;
  const sentTo = driver ? [driver.phone, driver.email].filter(Boolean).join(" · ") : "Fleet manager";
  const { error } = await supabase.from("reminders").insert({
    company_id: doc.company_id,
    document_id: doc.id,
    channel: "sms_email",
    sent_to: sentTo || null,
  });
  if (error) {
    toast.error("Could not queue the reminder");
    return;
  }
  toast.success(`Reminder queued for ${doc.ownerName}`, {
    description: `${doc.label}${sentTo ? ` → ${sentTo}` : ""}`,
  });
}

export async function updateExpiration(docId: string, expiresOn: string | null) {
  const { error } = await supabase.from("documents").update({ expires_on: expiresOn }).eq("id", docId);
  if (error) throw error;
}
