import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-company";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function CompanySwitcher() {
  const { companies, company, setCompanyId } = useCompany();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [adding, setAdding] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-2 text-left transition-colors hover:bg-sidebar-accent",
              collapsed && "justify-center border-transparent bg-transparent p-0",
            )}
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-signal font-display text-sm font-bold text-primary-foreground">
              {company ? initials(company.name) : <Building2 className="size-4" />}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-sidebar-accent-foreground">
                    {company?.name ?? "Loading…"}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-sidebar-foreground/70">
                    {company?.dot_number ?? "No DOT # on file"}
                  </span>
                </span>
                <ChevronsUpDown className="size-4 text-sidebar-foreground/60" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Switch company
          </DropdownMenuLabel>
          {companies.map((c) => (
            <DropdownMenuItem key={c.id} onSelect={() => setCompanyId(c.id)} className="gap-3 py-2">
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-accent font-display text-xs font-bold text-primary">
                {initials(c.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
              {c.id === company?.id && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAdding(true)} className="gap-3 py-2 font-semibold text-primary">
            <Plus className="size-4" /> Add trucking company
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddCompanyDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}

function AddCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { setCompanyId } = useCompany();
  const [name, setName] = useState("");
  const [dot, setDot] = useState("");
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("create_company", {
      _name: name,
      _dot_number: dot || undefined,
      _with_sample: sample,
    });
    setBusy(false);
    if (error || !data) {
      toast.error("Could not create company");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["companies"] });
    setCompanyId(data);
    toast.success(`${name} added`);
    setName("");
    setDot("");
    setSample(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add a trucking company</DialogTitle>
            <DialogDescription>Safety agencies can manage every client carrier from one login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Company name</Label>
            <Input id="c-name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-dot">USDOT number</Label>
            <Input
              id="c-dot"
              placeholder="USDOT 1234567"
              value={dot}
              onChange={(e) => setDot(e.target.value)}
              className="h-11 font-mono"
            />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <Checkbox checked={sample} onCheckedChange={(v) => setSample(v === true)} />
            <span>
              <span className="font-semibold">Start with sample drivers & trucks</span>
              <span className="block text-xs text-muted-foreground">Great for a quick demo — delete anytime.</span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="signal" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Create company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
