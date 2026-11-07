import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DRIVER_DOCS = ["cdl", "medical_card", "mvr", "drug_test"] as const;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function driverByToken(token: string) {
  const db = await admin();
  const { data: driver, error } = await db
    .from("drivers")
    .select("id, full_name, company_id")
    .eq("magic_token", token)
    .maybeSingle();
  if (error) throw new Error("Could not look up this link");
  if (!driver) throw new Error("This upload link is invalid or has been reset");
  return { db, driver };
}

/** Public: what a driver sees after opening their magic link. Returns no private contact data. */
export const getMagicLinkInfo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db, driver } = await driverByToken(data.token);
    const [{ data: company }, { data: docs }] = await Promise.all([
      db.from("companies").select("name").eq("id", driver.company_id).maybeSingle(),
      db
        .from("documents")
        .select("id, doc_type, expires_on, file_name, uploaded_at")
        .eq("driver_id", driver.id),
    ]);
    return {
      driverName: driver.full_name,
      companyName: company?.name ?? "Your carrier",
      documents: (docs ?? []).map((d) => ({
        docType: d.doc_type,
        expiresOn: d.expires_on,
        hasFile: Boolean(d.file_name),
        uploadedAt: d.uploaded_at,
      })),
    };
  });

/** Public: issue a one-time signed upload slot for one of the driver's own checklist items. */
export const createMagicUpload = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().uuid(),
      docType: z.enum(DRIVER_DOCS),
      fileName: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const { db, driver } = await driverByToken(data.token);
    const { data: doc } = await db
      .from("documents")
      .select("id, company_id")
      .eq("driver_id", driver.id)
      .eq("doc_type", data.docType)
      .maybeSingle();
    if (!doc) throw new Error("Checklist item not found");
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
    const path = `${doc.company_id}/${doc.id}/${Date.now()}-driver-${safe}`;
    const { data: signed, error } = await db.storage.from("documents").createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Could not prepare the upload");
    return { path, token: signed.token };
  });

/** Public: record a completed driver upload (and optional expiration date) on the checklist. */
export const finishMagicUpload = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().uuid(),
      docType: z.enum(DRIVER_DOCS),
      path: z.string().min(1).max(400),
      fileName: z.string().min(1).max(200),
      expiresOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { db, driver } = await driverByToken(data.token);
    const { data: doc } = await db
      .from("documents")
      .select("id, company_id")
      .eq("driver_id", driver.id)
      .eq("doc_type", data.docType)
      .maybeSingle();
    if (!doc) throw new Error("Checklist item not found");
    if (!data.path.startsWith(`${doc.company_id}/${doc.id}/`)) throw new Error("Invalid upload");

    const folder = `${doc.company_id}/${doc.id}`;
    const fileOnly = data.path.slice(folder.length + 1);
    const { data: listed } = await db.storage.from("documents").list(folder, { search: fileOnly });
    if (!listed?.some((f) => f.name === fileOnly)) throw new Error("Upload not found — please try again");

    const update: {
      file_path: string;
      file_name: string;
      uploaded_at: string;
      expires_on?: string;
    } = { file_path: data.path, file_name: data.fileName, uploaded_at: new Date().toISOString() };
    if (data.expiresOn) update.expires_on = data.expiresOn;

    const { error } = await db.from("documents").update(update).eq("id", doc.id);
    if (error) throw new Error("Could not save the document");
    return { ok: true };
  });
