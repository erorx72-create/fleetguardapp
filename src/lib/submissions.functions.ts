import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { submissionTypes, finishSubmissionSchema, validUploadPath } from "@/lib/submission-validation";

export const prepareSubmission = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().uuid(), docType: z.enum(submissionTypes), fileName: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: driver, error } = await db.from("drivers").select("id,company_id").eq("magic_token", data.token).maybeSingle();
    if (error || !driver) throw new Error("This upload link is no longer valid");
    const id = crypto.randomUUID();
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
    const path = `${driver.company_id}/${driver.id}/${id}/${safe}`;
    // The reservation binds the signed slot to the driver and type, before any upload.
    const { error: reserveError } = await db.from("document_submissions").insert({ id, company_id: driver.company_id, driver_id: driver.id, doc_type: data.docType, file_path: path, file_name: data.fileName, review_status: "rejected" });
    if (reserveError) throw new Error("Could not prepare the document");
    const { data: signed, error: uploadError } = await db.storage.from("document-uploads").createSignedUploadUrl(path);
    if (uploadError || !signed) throw new Error("Could not prepare the upload");
    return { submissionId: id, path, token: signed.token };
  });

export const completeSubmission = createServerFn({ method: "POST" })
  .inputValidator(finishSubmissionSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: driver } = await db.from("drivers").select("id,company_id").eq("magic_token", data.token).maybeSingle();
    if (!driver) throw new Error("This upload link is no longer valid");
    const { data: s } = await db.from("document_submissions").select("*").eq("id", data.submissionId).eq("driver_id", driver.id).maybeSingle();
    if (!s || s.review_status !== "rejected" || !validUploadPath(s.file_path, driver.company_id, driver.id, s.id)) throw new Error("Upload unavailable");
    const parts = s.file_path.split("/");
    const name = parts.pop();
    const { data: files, error } = await db.storage.from("document-uploads").list(parts.join("/"));
    const file = files?.find((f) => f.name === name);
    if (error || !file) throw new Error("Upload not found — please retry");
    const mime = String(file.metadata?.mimetype ?? "");
    if ((!mime.startsWith("image/") && mime !== "application/pdf") || Number(file.metadata?.size ?? 0) > 20 * 1024 * 1024) throw new Error("Choose an image or PDF up to 20MB");
    const { error: saveError } = await db.from("document_submissions").update({ review_status: "pending", state_of_issuance: s.doc_type === "cdl" ? data.state || null : null }).eq("id", s.id).eq("review_status", "rejected");
    if (saveError) throw new Error("Could not send the document");
    return { ok: true };
  });