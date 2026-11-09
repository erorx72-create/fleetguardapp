import { useState } from "react";
import { Check, Copy, Link2, MessageSquareText, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateFleet } from "@/hooks/use-fleet";
import type { Driver } from "@/lib/fleet";

export function MagicLinkDialog({ driver }: { driver: Driver }) {
  const invalidate = useInvalidateFleet();
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/u/${driver.magic_token}` : "";
  const firstName = driver.full_name.split(" ")[0];
  const sms = `Hi ${firstName}, please upload your compliance documents here (no password needed): ${link}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Magic link copied");
    setTimeout(() => setCopied(false), 1800);
  }

  async function reset() {
    const { error } = await supabase
      .from("drivers")
      .update({ magic_token: crypto.randomUUID() })
      .eq("id", driver.id);
    if (error) toast.error("Could not reset link");
    else {
      toast.success("New link generated — the old one no longer works");
      invalidate();
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="surface" size="lg">
          <Link2 /> Driver Magic Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-signal text-primary-foreground shadow-glow">
            <Smartphone className="size-6" />
          </span>
          <DialogTitle className="pt-2 font-display text-xl">Magic upload link for {firstName}</DialogTitle>
          <DialogDescription>
            {firstName} opens this on their phone and snaps photos of their documents. No app, no password.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-2 pl-4">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{link}</span>
          <Button size="sm" variant="signal" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {driver.phone && (
            <Button asChild variant="surface">
              <a href={`sms:${driver.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(sms)}`}>
                <MessageSquareText /> Text to {driver.phone}
              </a>
            </Button>
          )}
          <Button variant="ghost" onClick={reset} className="text-muted-foreground">
            <RefreshCw /> Reset link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
