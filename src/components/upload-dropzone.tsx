import { useRef, useState, type DragEvent } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export const ACCEPTED_FILES = "image/*,application/pdf";

export function UploadDropzone({
  onFile,
  busy,
  compact,
  label = "Upload Photo / PDF",
}: {
  onFile: (file: File) => void | Promise<void>;
  busy?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        "group flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-input bg-muted/50 text-center transition-all hover:border-primary/50 hover:bg-accent disabled:opacity-60",
        compact ? "px-4 py-4" : "px-4 py-7",
        over && "border-primary bg-accent",
      )}
    >
      {busy ? (
        <Loader2 className="size-6 animate-spin text-primary" />
      ) : (
        <UploadCloud className="size-6 text-primary transition-transform group-hover:-translate-y-0.5" />
      )}
      <span className="text-sm font-bold text-foreground">{busy ? "Uploading…" : label}</span>
      {!compact && <span className="text-xs text-muted-foreground">Drag & drop or tap to choose · max 20MB</span>}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_FILES}
        capture={undefined}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
