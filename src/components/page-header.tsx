import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="animate-rise">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 text-3xl font-extrabold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">{icon}</span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
