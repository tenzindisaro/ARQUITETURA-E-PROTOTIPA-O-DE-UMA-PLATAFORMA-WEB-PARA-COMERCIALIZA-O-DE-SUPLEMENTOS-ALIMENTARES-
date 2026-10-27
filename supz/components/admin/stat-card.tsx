import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const tons = {
    default: "bg-primary/10 text-primary",
    warning: "bg-accent/15 text-accent-hover",
    success: "bg-success/15 text-success",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-black">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tons[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
