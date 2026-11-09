import { Lock } from "lucide-react";
import { PricingModalContent } from "@/components/pricing-cards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

export function PaywallOverlay() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 backdrop-blur-md">
      <div className="mx-4 w-full max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/15">
            <Lock className="size-8 text-danger-foreground" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-navy-foreground">
          Your Free Trial Has Ended
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-navy-foreground/70">
          Your 3-day free trial has expired. To guarantee uninterrupted DOT compliance tracking
          and prevent automated account lock, select a plan below.
        </p>
        <div className="mt-5">
          <Button variant="signal" size="lg" onClick={() => setShowDetails(true)}>
            View Pricing Plans
          </Button>
        </div>
        <div className="mt-4 inline-block rounded-lg border border-warning/30 bg-warning-soft px-4 py-2 text-xs font-semibold text-warning-foreground">
          All-Inclusive Standard Rate — 100% Flat Pricing. No Per-Driver Fees.
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle className="sr-only">FleetGuard Pricing Plans</DialogTitle>
          <DialogDescription className="sr-only">
            Choose a subscription plan to upgrade your account.
          </DialogDescription>
          <PricingModalContent onClose={() => setShowDetails(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PaywallLoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 backdrop-blur-md">
      <div className="h-8 w-8 animate-pulse rounded-full bg-navy-foreground/20" />
    </div>
  );
}
