import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Crown, Gem, Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, buildMailto, type Plan } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

const PLAN_ICONS: Record<Plan["icon"], LucideIcon> = {
  starter: ShieldCheck,
  platinum: Crown,
  diamond: Gem,
};

function useUserEmail() {
  return useQuery({
    queryKey: ["user-email"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.email ?? "";
    },
    staleTime: Infinity,
  });
}

const FLAT_PRICING_BADGE = "All-Inclusive Standard Rate — 100% Flat Pricing. No Per-Driver Fees.";

export function PricingCards({ onModalClose }: { onModalClose?: () => void }) {
  const { data: email } = useUserEmail();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan, idx) => (
        <PricingCard key={plan.id} plan={plan} email={email ?? ""} delay={idx * 0.08} onModalClose={onModalClose} />
      ))}
    </div>
  );
}

function PricingCard({
  plan,
  email,
  delay,
  onModalClose,
}: {
  plan: Plan;
  email: string;
  delay: number;
  onModalClose?: () => void;
}) {
  const Icon = PLAN_ICONS[plan.icon];
  const isFeatured = plan.id === "platinum";

  return (
    <div
      className={cn(
        "surface-card surface-interactive animate-rise flex flex-col p-6",
        isFeatured && "bg-gradient-signal text-primary-foreground shadow-glow",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            isFeatured ? "bg-white/15" : "bg-accent",
          )}
        >
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">{plan.name}</h3>
          <p className={cn("text-sm", isFeatured ? "text-white/80" : "text-muted-foreground")}>
            {plan.priceLabel} flat
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mb-4 rounded-lg border px-3 py-2 text-center text-xs font-semibold",
          isFeatured
            ? "border-white/20 bg-white/10 text-white"
            : "border-warning/30 bg-warning-soft text-warning-foreground",
        )}
      >
        {FLAT_PRICING_BADGE}
      </div>

      <ul className="mb-6 space-y-2.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className={cn("mt-0.5 size-4 shrink-0", isFeatured ? "text-white" : "text-success-foreground")} />
            <span className={isFeatured ? "text-white/90" : ""}>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={isFeatured ? "surface" : "signal"}
        className="mt-auto"
        onClick={onModalClose}
      >
        <a href={buildMailto(plan.id, email)}>Select Plan</a>
      </Button>
    </div>
  );
}

export function PricingModalContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="px-1 py-2">
      <div className="mb-5 text-center">
        <h2 className="font-display text-2xl font-extrabold">Upgrade Your FleetGuard Plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a plan below to continue your DOT compliance without interruption.
        </p>
        <div className="mt-3 inline-block rounded-lg border border-warning/30 bg-warning-soft px-4 py-2 text-xs font-semibold text-warning-foreground">
          {FLAT_PRICING_BADGE}
        </div>
      </div>
      <PricingCards onModalClose={onClose} />
    </div>
  );
}
