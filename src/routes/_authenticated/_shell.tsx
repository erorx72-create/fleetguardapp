import { createFileRoute, Outlet } from "@tanstack/react-router";
import { format } from "date-fns";
import { useState } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/components/app-sidebar";
import { CompanyProvider, useCompany } from "@/hooks/use-company";
import { TrialBanner } from "@/components/trial-banner";
import { PaywallOverlay } from "@/components/paywall-overlay";
import { PricingModalContent } from "@/components/pricing-cards";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const [showPricing, setShowPricing] = useState(false);
  const { data: subscription } = useSubscription();
  const isLocked = subscription?.is_locked ?? false;
  const trialHours = subscription?.trial_hours_remaining ?? 72;
  const isTrialActive = subscription?.is_trial_active ?? true;

  return (
    <CompanyProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="bg-background">
            {isTrialActive && !isLocked && (
              <TrialBanner hoursRemaining={trialHours} onUpgrade={() => setShowPricing(true)} />
            )}
            <TopBar />
            <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 md:px-8 md:py-10">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
        {isLocked && <PaywallOverlay />}

        <Dialog open={showPricing} onOpenChange={setShowPricing}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogTitle className="sr-only">FleetGuard Pricing Plans</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a subscription plan to upgrade your account.
            </DialogDescription>
            <PricingModalContent onClose={() => setShowPricing(false)} />
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </CompanyProvider>
  );
}

function TopBar() {
  const { company } = useCompany();
  return (
    <header className="print-hidden sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <SidebarTrigger className="text-muted-foreground" />
      <span className="h-5 w-px bg-border" />
      <p className="truncate text-sm font-semibold">{company?.name}</p>
      <p className="ml-auto hidden font-mono text-xs text-muted-foreground sm:block">
        {format(new Date(), "EEE, MMM d yyyy")}
      </p>
    </header>
  );
}
