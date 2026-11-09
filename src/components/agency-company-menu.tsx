import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddCompanyDialog } from "@/components/company-switcher";
import { supabase } from "@/integrations/supabase/client";

export function AgencyCompanyMenu() {
  const { companies, company, setCompanyId } = useCompany();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const agency = companies.some((c) => c.type === "safety_agency");
  async function enableAgency() {
    if (!company) return;
    const { error } = await supabase.rpc("configure_company_type", { _company: company.id, _type: "safety_agency" });
    if (error) toast.error("Could not update company type");
    else await qc.invalidateQueries({ queryKey: ["companies"] });
  }
  if (!agency) return <Button variant="ghost" size="sm" onClick={enableAgency}><Building2 /> Manage as safety agency</Button>;
  return <div className="flex flex-wrap items-center gap-3 border-b border-border pb-5"><Building2 className="size-5 text-primary" /><span className="font-semibold">Agency companies</span><Select value={company?.id ?? ""} onValueChange={setCompanyId}><SelectTrigger aria-label="Agency companies" className="w-full sm:w-72"><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><Button variant="surface" onClick={() => setAdding(true)}><Plus /> Add company</Button><AddCompanyDialog open={adding} onOpenChange={setAdding} /></div>;
}