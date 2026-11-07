import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { UploadDropzone } from "@/components/upload-dropzone";
import { updateExpiration } from "@/components/doc-actions";
import { useInvalidateFleet } from "@/hooks/use-fleet";
import { DOC_HINTS, describeDays, type DocType } from "@/lib/compliance";
import { openDocumentFile, uploadDocumentFile, type EnrichedDoc } from "@/lib/fleet";
import { cn } from "@/lib/utils";

export function DocCard({ doc, delay = 0 }: { doc: EnrichedDoc; delay?: number }) {
  const invalidate = useInvalidateFleet();
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("That file is over 20MB");
      return;
    }
    setBusy(true);
    try {
      await uploadDocumentFile(doc, file);
      toast.success(`${doc.label} uploaded`);
      await invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDate(value: string) {
    try {
      await updateExpiration(doc.id, value || null);
      toast.success("Expiration date saved");
      await invalidate();
    } catch {
      toast.error("Could not save the date");
    }
  }

  const red = doc.status === "expired" || doc.status === "missing";

  return (
    <div
      className={cn(
        "surface-card surface-interactive relative flex animate-rise flex-col overflow-hidden p-6",
        red && "border-danger/30",
        doc.status === "expiring" && "border-warning/40",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{doc.label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{DOC_HINTS[doc.doc_type as DocType]}</p>
        </div>
        <StatusBadge status={doc.status} size="sm" />
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p
            className={cn(
              "font-display text-2xl font-extrabold",
              red && "text-danger-foreground",
              doc.status === "expiring" && "text-warning-foreground",
              doc.status === "compliant" && "text-success-foreground",
            )}
          >
            {describeDays(doc.days)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {doc.expires_on ? `Expires ${format(new Date(doc.expires_on + "T00:00:00"), "MMM d, yyyy")}` : "Set an expiration date"}
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium shadow-soft transition-colors focus-within:border-primary hover:border-primary/40">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="sr-only">Expiration date for {doc.label}</span>
          <input
            type="date"
            defaultValue={doc.expires_on ?? ""}
            key={doc.expires_on ?? "none"}
            onBlur={(e) => {
              if ((e.target.value || null) !== doc.expires_on) onDate(e.target.value);
            }}
            className="bg-transparent font-mono text-xs outline-none"
          />
        </label>
      </div>

      {doc.file_path && (
        <button
          type="button"
          onClick={() => openDocumentFile(doc.file_path!).catch(() => toast.error("Could not open file"))}
          className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium">{doc.file_name}</span>
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </button>
      )}

      <div className="mt-4">
        <UploadDropzone onFile={onFile} busy={busy} compact={Boolean(doc.file_path)} label={doc.file_path ? "Replace file" : "Upload Photo / PDF"} />
      </div>
    </div>
  );
}
