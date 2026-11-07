import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-company";
import { useInvalidateFleet } from "@/hooks/use-fleet";

const EMPTY = { full_name: "", phone: "", email: "", hire_date: "" };

export function AddDriverDialog() {
  const { company } = useCompany();
  const invalidate = useInvalidateFleet();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("drivers")
      .insert({
        company_id: company.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        hire_date: form.hire_date || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error("Could not add driver");
      return;
    }
    toast.success(`${form.full_name} added — upload their 4 documents next`);
    await invalidate();
    setOpen(false);
    setForm(EMPTY);
    navigate({ to: "/drivers/$driverId", params: { driverId: data.id } });
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="signal" size="lg">
          <Plus /> Add Driver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add a driver</DialogTitle>
            <DialogDescription>We&apos;ll create their DQF checklist automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="d-name">Full name</Label>
            <Input id="d-name" required value={form.full_name} onChange={set("full_name")} className="h-11" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="d-phone">Phone</Label>
              <Input id="d-phone" type="tel" placeholder="(555) 555-0100" value={form.phone} onChange={set("phone")} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-hire">Hire date</Label>
              <Input id="d-hire" type="date" value={form.hire_date} onChange={set("hire_date")} className="h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-email">Email</Label>
            <Input id="d-email" type="email" value={form.email} onChange={set("email")} className="h-11" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="signal" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Add driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
