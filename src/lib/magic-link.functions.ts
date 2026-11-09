import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public token capability: returns only the driver's upload-page display information. */
export const getMagicLinkInfo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: driver, error } = await db.from("drivers").select("id,full_name,company_id").eq("magic_token", data.token).maybeSingle();
    if (error || !driver) throw new Error("This upload link is invalid or has been reset");
    const { data: company } = await db.from("companies").select("name").eq("id", driver.company_id).maybeSingle();
    return { driverName: driver.full_name, companyName: company?.name ?? "Your carrier" };
  });