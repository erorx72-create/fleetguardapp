import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandMark } from "@/components/brand";
import { getMagicLinkInfo } from "@/lib/magic-link.functions";
import { prepareSubmission, completeSubmission } from "@/lib/submissions.functions";
import { supabase } from "@/integrations/supabase/client";

export function DriverUploadForm({ token }: { token: string }) {
  const info = useQuery({ queryKey: ["magic", token], queryFn: () => getMagicLinkInfo({ data: { token } }), retry: false });
  const prepare = useServerFn(prepareSubmission);
  const complete = useServerFn(completeSubmission);
  const input = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"cdl" | "medical_card" | "annual_inspection">("cdl");
  const [state, setState] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > 20 * 1024 * 1024 || (!file.type.startsWith("image/") && file.type !== "application/pdf")) {
      toast.error("Choose an image or PDF up to 20MB"); return;
    }
    setBusy(true);
    try {
      const slot = await prepare({ data: { token, docType: type, fileName: file.name } });
      const { error } = await supabase.storage.from("document-uploads").uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
      if (error) throw error;
      await complete({ data: { token, submissionId: slot.submissionId, state: type === "cdl" ? state : undefined } });
      setSent(true); setFile(null); setState("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload — please retry");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-background px-5 py-10">
    <div className="mx-auto max-w-md space-y-8">
      <BrandMark className="size-10" />
      {info.isLoading ? <Loader2 className="animate-spin" aria-label="Loading" /> : info.error ? <><h1 className="text-2xl font-bold">This link isn’t working</h1><p className="text-muted-foreground">Ask your safety manager for a new upload link.</p></> : <>
        <header><p className="text-sm font-semibold text-muted-foreground">{info.data?.companyName}</p><h1 className="mt-2 text-3xl font-bold">{info.data?.driverName}</h1></header>
        {sent ? <div className="space-y-4" role="status"><CheckCircle2 className="size-12 text-success-foreground" /><h2 className="text-xl font-bold">Document sent for review</h2><Button variant="surface" onClick={() => setSent(false)}>Upload another document</Button></div> : <form onSubmit={submit} className="space-y-6">
          <Button type="button" variant="signal" className="h-16 w-full text-base" disabled={busy} onClick={() => input.current?.click()}><Camera /> {file ? "Replace photo / file" : "Take photo / choose file"}</Button>
          <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          {file && <p className="break-all text-sm font-medium">{file.name}</p>}
          <div className="space-y-2"><Label>Document type</Label><Select value={type} disabled={busy} onValueChange={(v) => { if (v === "cdl" || v === "medical_card" || v === "annual_inspection") setType(v); }}><SelectTrigger className="h-12 w-full" aria-label="Document type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cdl">CDL</SelectItem><SelectItem value="medical_card">Medical Card</SelectItem><SelectItem value="annual_inspection">Annual Inspection</SelectItem></SelectContent></Select></div>
          {type === "cdl" && <div className="space-y-2"><Label htmlFor="issuance">State of Issuance (optional)</Label><Input id="issuance" maxLength={80} value={state} disabled={busy} onChange={(e) => setState(e.target.value)} className="h-12" /></div>}
          <Button type="submit" variant="signal" disabled={!file || busy} className="h-12 w-full">{busy && <Loader2 className="animate-spin" />} {busy ? "Sending…" : "Submit document"}</Button>
        </form>}
      </>}
    </div>
  </main>;
}