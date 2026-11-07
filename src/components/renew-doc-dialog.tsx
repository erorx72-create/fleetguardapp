import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { UploadDropzone } from "@/components/upload-dropzone";
import { updateExpiration } from "@/components/doc-actions";
import { useInvalidateFleet } from "@/hooks/use-fleet";
import { uploadDocumentFile, type EnrichedDoc } from "@/lib/fleet";

export function RenewDocDialog({ doc, onOpenChange }: { doc: EnrichedDoc | null; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidateFleet();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFile(null);
    setDate("");
  }, [doc?.id]);

  async function save() {
    if (!doc) return;
    if (!file && !date) {
      toast.error("Add a file or a new expiration date");
      return;
    }
    setBusy(true);
    try {
      if (file) await uploadDocumentFile(doc, file);
      if (date) await updateExpiration(doc.id, date);
      toast.success(`${doc.label} renewed for ${doc.ownerName}`);
      await invalidate();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(doc)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Upload new {doc?.label}</DialogTitle>
          <DialogDescription>
            {doc?.ownerName} {doc && <StatusBadge status={doc.status} size="sm" className="ml-2" />}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent px-4 py-3 text-sm">
              <FileText className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
              <button type="button" className="text-xs font-semibold text-primary" onClick={() => setFile(null)}>
                Change
              </button>
            </div>
          ) : (
            <UploadDropzone onFile={setFile} />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="renew-date">New expiration date</Label>
            <Input id="renew-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="signal" onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Save renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
