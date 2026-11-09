import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DOC_LABELS } from "@/lib/compliance";
import { vehicleName, type FleetData } from "@/lib/fleet";
import type { Tables } from "@/integrations/supabase/types";

type Submission = Tables<"document_submissions">;
export function PendingReviews({ companyId, fleet }: { companyId: string; fleet: FleetData }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["submissions", companyId], refetchInterval: 5000, queryFn: async () => {
    const { data, error } = await supabase.from("document_submissions").select("*").eq("company_id", companyId).eq("review_status", "pending").order("submitted_at");
    if (error) throw error; return data;
  } });
  const [selected, setSelected] = useState<Submission | null>(null);
  const [date, setDate] = useState("");
  const [state, setState] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function review(s: Submission) {
    setSelected(s); setDate(""); setState(s.state_of_issuance ?? ""); setVehicle(""); setUrl("");
    const { data, error } = await supabase.storage.from("document-uploads").createSignedUrl(s.file_path, 600);
    if (error) toast.error("Could not open the document"); else setUrl(data.signedUrl);
  }
  async function approve(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("approve_document_submission", { _submission: selected.id, _expires_on: date, _state: state, ...(vehicle ? { _vehicle: vehicle } : {}) });
    setBusy(false);
    if (error) { toast.error("Could not approve the document. Refresh and try again."); return; }
    setSelected(null); toast.success("Document approved");
    await Promise.all([qc.invalidateQueries({ queryKey: ["submissions", companyId] }), qc.invalidateQueries({ queryKey: ["fleet", companyId] })]);
  }
  if (query.error) return <p role="alert" className="text-danger-foreground">Pending reviews could not be loaded.</p>;
  return <section aria-label="Pending document reviews" className="space-y-4">
    <h2 className="flex items-center gap-2 text-xl font-bold"><ClipboardCheck className="size-5 text-primary" /> Pending document reviews <span className="text-sm text-muted-foreground">{query.data?.length ?? 0}</span></h2>
    {query.data?.length === 0 && <p className="text-sm text-muted-foreground">No documents awaiting review.</p>}
    {query.data?.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"><div className="min-w-0"><p className="font-semibold">New document upload pending manual review from {fleet.drivers.find((d) => d.id === s.driver_id)?.full_name ?? "Driver"}</p><p className="text-sm text-muted-foreground">{DOC_LABELS[s.doc_type]}</p></div><Button variant="surface" onClick={() => review(s)}><ClipboardCheck /> Review</Button></div>)}
    <Dialog open={Boolean(selected)} onOpenChange={(v) => { if (!v && !busy) setSelected(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Review {selected ? DOC_LABELS[selected.doc_type] : "document"}</DialogTitle></DialogHeader>
      {url && <><Button asChild variant="surface"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open original document</a></Button>{selected?.file_name.toLowerCase().endsWith(".pdf") ? <iframe title="Document preview" src={url} className="h-72 w-full border border-border" /> : <img src={url} alt="Submitted document" className="max-h-80 w-full object-contain" />}</>}
      <form onSubmit={approve} className="space-y-4"><div className="space-y-2"><Label htmlFor="review-date">Expiration date</Label><Input id="review-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
        {selected?.doc_type === "cdl" && <div className="space-y-2"><Label htmlFor="review-state">State of Issuance</Label><Input id="review-state" maxLength={80} value={state} onChange={(e) => setState(e.target.value)} /></div>}
        {selected?.doc_type === "annual_inspection" && <div className="space-y-2"><Label>Truck / trailer</Label><Select value={vehicle} onValueChange={setVehicle}><SelectTrigger aria-label="Truck / trailer"><SelectValue placeholder="Select inspected unit" /></SelectTrigger><SelectContent>{fleet.vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{vehicleName(v)}</SelectItem>)}</SelectContent></Select></div>}
        <Button type="submit" variant="signal" disabled={busy || !url || !date || (selected?.doc_type === "annual_inspection" && !vehicle)}>{busy ? <Loader2 className="animate-spin" /> : <ClipboardCheck />} Approve</Button>
      </form>
    </DialogContent></Dialog>
  </section>;
}