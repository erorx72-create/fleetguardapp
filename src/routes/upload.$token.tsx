import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DOC_HINTS, DOC_LABELS, DRIVER_DOC_TYPES, docStatus, describeDays, daysUntil } from "@/lib/compliance";
import { createMagicUpload, finishMagicUpload, getMagicLinkInfo } from "@/lib/magic-link.functions";

export const Route = createFileRoute("/upload/$token")({
  head: () => ({
    meta: [
      { title: "Upload your documents — FleetGuard" },
      { name: "description", content: "Snap a photo of your compliance documents. No password needed." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Upload your documents — FleetGuard" },
      { property: "og:description", content: "Snap a photo of your compliance documents. No password needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MagicUploadPage,
});

type DriverDoc = (typeof DRIVER_DOC_TYPES)[number];

function MagicUploadPage() {
  const { token } = Route.useParams();
  const query = useQuery({
    queryKey: ["magic", token],
    queryFn: () => getMagicLinkInfo({ data: { token } }),
    retry: false,
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <BrandMark className="size-12" />
        <h1 className="text-2xl font-extrabold">This link isn&apos;t working</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          It may have been reset. Ask your safety manager to send you a new upload link.
        </p>
      </div>
    );
  }

  const info = query.data;
  const firstName = info.driverName.split(" ")[0];
  const done = info.documents.filter((d) => d.hasFile).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero px-5 pb-16 pt-8 text-navy-foreground">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-8" />
            <span className="text-sm font-semibold text-navy-muted">{info.companyName}</span>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold">Hi {firstName} 👋</h1>
          <p className="mt-2 text-navy-muted">
            Tap a card and snap a clear photo. That&apos;s it — no password, no app.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-navy-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-signal transition-all duration-700"
              style={{ width: `${(done / Math.max(1, info.documents.length)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-navy-muted">
            {done} of {info.documents.length} uploaded
          </p>
        </div>
      </header>
      <main className="mx-auto -mt-10 max-w-md space-y-4 px-5 pb-12">
        {DRIVER_DOC_TYPES.map((t) => {
          const doc = info.documents.find((d) => d.docType === t);
          return (
            <MagicDocCard
              key={t}
              token={token}
              docType={t as DriverDoc}
              expiresOn={doc?.expiresOn ?? null}
              hasFile={Boolean(doc?.hasFile)}
            />
          );
        })}
        <p className="flex items-center justify-center gap-1.5 pt-4 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Securely sent to {info.companyName}
        </p>
      </main>
    </div>
  );
}

function MagicDocCard({
  token,
  docType,
  expiresOn,
  hasFile,
}: {
  token: string;
  docType: DriverDoc;
  expiresOn: string | null;
  hasFile: boolean;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const status = docStatus(expiresOn);

  async function submit() {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("That file is over 20MB");
    setBusy(true);
    try {
      const slot = await createMagicUpload({ data: { token, docType, fileName: file.name } });
      const { error } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || undefined });
      if (error) throw error;
      await finishMagicUpload({
        data: { token, docType, path: slot.path, fileName: file.name, expiresOn: date || null },
      });
      toast.success(`${DOC_LABELS[docType]} sent!`);
      setFile(null);
      setDate("");
      await qc.invalidateQueries({ queryKey: ["magic", token] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{DOC_LABELS[docType]}</h2>
          <p className="text-xs text-muted-foreground">{DOC_HINTS[docType]}</p>
        </div>
        {hasFile ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-success-foreground">
            <CheckCircle2 className="size-4" /> On file
          </span>
        ) : (
          <StatusBadge status={status} size="sm" />
        )}
      </div>
      {expiresOn && <p className="mt-2 text-xs font-medium text-muted-foreground">{describeDays(daysUntil(expiresOn))}</p>}

      {file ? (
        <div className="mt-4 space-y-3">
          <p className="truncate rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">{file.name}</p>
          <div className="space-y-1.5">
            <Label htmlFor={`exp-${docType}`}>Expiration date on the document</Label>
            <Input id={`exp-${docType}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-12 flex-1" onClick={() => setFile(null)} disabled={busy}>
              Retake
            </Button>
            <Button variant="signal" className="h-12 flex-[2]" onClick={submit} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Send document
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant={hasFile ? "surface" : "signal"}
          className="mt-4 h-14 w-full text-base"
          onClick={() => input.current?.click()}
        >
          <Camera className="!size-5" /> {hasFile ? "Upload a newer copy" : "Snap photo / upload PDF"}
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
