import { STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/prisma/generated/enums";
import { cn } from "@/lib/utils";

const CORES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-accent/15 text-accent-hover",
  PAID: "bg-success/15 text-success",
  PROCESSING: "bg-primary/10 text-primary",
  SHIPPED: "bg-primary/10 text-primary",
  DELIVERED: "bg-success/15 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold",
        CORES[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
