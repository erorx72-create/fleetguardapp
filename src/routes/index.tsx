import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BellRing, FileCheck2, Smartphone, ShieldCheck } from "lucide-react";
import heroTruck from "@/assets/hero-truck.jpg";
import { Brand } from "@/components/brand";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FleetGuard — Never miss a DOT expiration again" },
      {
        name: "description",
        content:
          "DOT compliance command center for trucking companies and safety agencies. Driver files, truck inspections and audit reports in one place.",
      },
      { property: "og:title", content: "FleetGuard — Never miss a DOT expiration again" },
      {
        property: "og:description",
        content:
          "Traffic-light compliance tracking for CDLs, medical cards, inspections and insurance across your whole fleet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BellRing,
    title: "Know before it expires",
    body: "Green, yellow, red. Every CDL, med card, inspection and policy sorted by what needs you first.",
  },
  {
    icon: Smartphone,
    title: "Driver magic links",
    body: "Text a link. Drivers snap a photo of their license from the cab — no app, no password.",
  },
  {
    icon: FileCheck2,
    title: "One-click DOT audit",
    body: "A clean, printable compliance summary with your Fleet Safety Score, ready for any officer.",
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden bg-gradient-hero text-navy-foreground">
        <img
          src={heroTruck}
          alt="White semi-truck on an interstate at dusk"
          width={1920}
          height={1088}
          className="absolute inset-0 -z-10 h-full w-full object-cover object-right opacity-70"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/10" />
        <div className="absolute inset-0 -z-10 bg-grid-faint [mask-image:linear-gradient(to_right,black,transparent_70%)]" />

        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Brand light />
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild variant="signal">
                <Link to="/dashboard">
                  Open dashboard <ArrowRight />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghostLight" size="default">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild variant="signal">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Start free
                  </Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-28 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 py-1 text-xs font-semibold text-navy-muted backdrop-blur">
              <ShieldCheck className="size-3.5 text-primary-glow" /> Built for FMCSA & DOT compliance
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] md:text-7xl">
              Never miss a <span className="text-gradient-signal">DOT expiration</span> again.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-navy-muted">
              FleetGuard is the compliance command center for trucking companies and safety agencies.
              Every driver, truck and document — one glance, one color.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="signal" size="xl">
                <Link to={signedIn ? "/dashboard" : "/auth"} search={signedIn ? undefined : { mode: "signup" }}>
                  {signedIn ? "Go to Command Center" : "Create your fleet in 30 seconds"} <ArrowRight />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-navy-muted">
              Starts with a sample fleet so you see it working instantly.
            </p>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute right-0 top-6 w-80 animate-float rounded-2xl border border-navy-foreground/10 bg-card/95 p-5 text-card-foreground shadow-lift backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sarah Mitchell
              </p>
              <p className="mt-1 font-display text-lg font-bold">DOT Medical Card</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">12 days left</span>
                <StatusBadge status="expiring" size="sm" />
              </div>
            </div>
            <div
              className="absolute right-24 top-48 w-80 animate-float rounded-2xl border border-navy-foreground/10 bg-card/95 p-5 text-card-foreground shadow-lift backdrop-blur"
              style={{ animationDelay: "1.2s" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                David Rodriguez
              </p>
              <p className="mt-1 font-display text-lg font-bold">CDL License</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expired 5 days ago</span>
                <StatusBadge status="expired" size="sm" />
              </div>
            </div>
            <div
              className="absolute right-4 top-[22rem] w-72 animate-float rounded-2xl border border-navy-foreground/10 bg-card/95 p-5 text-card-foreground shadow-lift backdrop-blur"
              style={{ animationDelay: "2.4s" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Truck #101
              </p>
              <p className="mt-1 font-display text-lg font-bold">Annual Inspection</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">250 days left</span>
                <StatusBadge status="compliant" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-14 max-w-7xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="surface-card surface-interactive animate-rise p-7"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <Brand />
          <p>© {new Date().getFullYear()} FleetGuard. DOT compliance, simplified.</p>
        </div>
      </footer>
    </div>
  );
}
