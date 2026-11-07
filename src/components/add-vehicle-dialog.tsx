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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/use-company";
import { useInvalidateFleet } from "@/hooks/use-fleet";

const EMPTY = { unit_number: "", vin: "", plate: "", kind: "truck" as "truck" | "trailer" };

export function AddVehicleDialog() {
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
      .from("vehicles")
      .insert({
        company_id: company.id,
        kind: form.kind,
        unit_number: form.unit_number.trim().replace(/^#/, ""),
        vin: form.vin.trim().toUpperCase() || null,
        plate: form.plate.trim().toUpperCase() || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error("Could not add unit");
      return;
    }
    toast.success(`Unit #${form.unit_number} added`);
    await invalidate();
    setOpen(false);
    setForm(EMPTY);
    navigate({ to: "/trucks/$vehicleId", params: { vehicleId: data.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="signal" size="lg">
          <Plus /> Add Truck
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add a truck or trailer</DialogTitle>
            <DialogDescription>Inspection, registration and insurance checklist is created for you.</DialogDescription>
          </DialogHeader>
          <ToggleGroup
            type="single"
            variant="outline"
            value={form.kind}
            onValueChange={(v) => v && setForm((f) => ({ ...f, kind: v as "truck" | "trailer" }))}
            className="w-full"
          >
            <ToggleGroupItem value="truck" className="flex-1">Truck</ToggleGroupItem>
            <ToggleGroupItem value="trailer" className="flex-1">Trailer</ToggleGroupItem>
          </ToggleGroup>
          <div className="space-y-1.5">
            <Label htmlFor="v-unit">Unit #</Label>
            <Input
              id="v-unit"
              required
              placeholder="305"
              value={form.unit_number}
              onChange={(e) => setForm((f) => ({ ...f, unit_number: e.target.value }))}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-vin">VIN</Label>
            <Input
              id="v-vin"
              maxLength={17}
              placeholder="17 characters"
              value={form.vin}
              onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
              className="h-11 font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-plate">License plate</Label>
            <Input
              id="v-plate"
              placeholder="TX 8KL-2291"
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
              className="h-11 font-mono uppercase"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="signal" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Add unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
