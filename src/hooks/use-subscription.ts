import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanId = "starter" | "platinum" | "diamond";

export interface SubscriptionStatus {
  plan: string;
  status: string;
  trial_started_at: string;
  trial_expires_at: string;
  trial_hours_remaining: number;
  is_trial_active: boolean;
  is_locked: boolean;
  days_since_creation: number;
}

const FALLBACK: SubscriptionStatus = {
  plan: "starter",
  status: "trial",
  trial_started_at: new Date().toISOString(),
  trial_expires_at: new Date(Date.now() + 72 * 3600_000).toISOString(),
  trial_hours_remaining: 72,
  is_trial_active: true,
  is_locked: false,
  days_since_creation: 0,
};

export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_subscription_status");
      if (error) throw error;
      if (!data || data.length === 0) return FALLBACK;
      return data[0] as SubscriptionStatus;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  icon: "starter" | "platinum" | "diamond";
  truckLimit: number;
  companyLimit: number;
  features: string[];
  badge: string;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Titanium Starter",
    price: 99,
    priceLabel: "$99/mo",
    icon: "starter",
    truckLimit: 10,
    companyLimit: 1,
    features: [
      "Up to 10 trucks",
      "1 company / DOT number",
      "Full DOT compliance tracking",
      "Driver qualification files",
      "Document expiry alerts",
      "3-day free trial included",
    ],
    badge: "All-Inclusive Standard Rate — 100% Flat Pricing. No Per-Driver Fees.",
  },
  {
    id: "platinum",
    name: "Platinum Directors",
    price: 199,
    priceLabel: "$199/mo",
    icon: "platinum",
    truckLimit: 30,
    companyLimit: 1,
    features: [
      "Up to 30 trucks",
      "1 company / DOT number",
      "Everything in Starter, plus:",
      "Priority document review",
      "Advanced compliance analytics",
      "Dedicated support channel",
    ],
    badge: "All-Inclusive Standard Rate — 100% Flat Pricing. No Per-Driver Fees.",
  },
  {
    id: "diamond",
    name: "Diamond Agency",
    price: 1499,
    priceLabel: "$1,499/mo",
    icon: "diamond",
    truckLimit: 999999,
    companyLimit: 50,
    features: [
      "Unlimited trucks",
      "Up to 50 companies / DOT numbers",
      "Multi-company master dashboard",
      "Everything in Platinum, plus:",
      "White-label compliance reports",
      "Account manager & onboarding",
    ],
    badge: "All-Inclusive Standard Rate — 100% Flat Pricing. No Per-Driver Fees.",
  },
];

const MAILTO_SUBJECTS: Record<PlanId, string> = {
  starter: "Starter Plan Subscription Request",
  platinum: "Platinum Directors Plan Subscription Request",
  diamond: "Diamond Agency Plan Subscription Request",
};

const MAILTO_BODIES: Record<PlanId, string> = {
  starter:
    "Hello FleetGuard Team,\nI have been using your platform for 3 days and I really liked it. I would like to buy a 1-month subscription for the STARTER PLAN ($99/month, all-inclusive, no hidden fees) for my fleet. Please send me the payment details to activate my account.\nMy registered email is: [User_Email_Here]",
  platinum:
    "Hello FleetGuard Team,\nI have been using your platform for 3 days and I really liked it. I am a professional safety director and I would like to buy a 1-month subscription for the PLATINUM DIRECTORS PLAN ($199/month, all-inclusive, no hidden fees) to manage my fleets. Please send me the payment details to activate my account.\nMy registered email is: [User_Email_Here]",
  diamond:
    "Hello FleetGuard Team,\nI have been using your platform for 3 days and I really liked it. We are an independent compliance agency and we would like to buy a 1-month subscription for the DIAMOND AGENCY PLAN ($1,499/month, all-inclusive, no hidden fees) to manage all our carrier clients. Please send us the payment details to activate our master account.\nMy registered email is: [User_Email_Here]",
};

export function buildMailto(planId: PlanId, userEmail: string): string {
  const subject = MAILTO_SUBJECTS[planId];
  const body = MAILTO_BODIES[planId].replace("[User_Email_Here]", userEmail || "—");
  const params = new URLSearchParams({ subject, body });
  return `mailto:erorx72@gmail.com?${params.toString()}`;
}

export { FALLBACK as SUBSCRIPTION_FALLBACK };
