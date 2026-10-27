import "server-only";
import { db } from "@/lib/db";

/** Cupom oferecido em troca do cadastro na newsletter. */
export const NEWSLETTER_COUPON = "SUPZ10";

export async function subscribe(email: string) {
  const normalizado = email.trim().toLowerCase();

  // Reinscrição de quem havia cancelado reativa o cadastro, sem duplicar.
  await db.newsletterSubscriber.upsert({
    where: { email: normalizado },
    create: { email: normalizado },
    update: { isActive: true, unsubscribedAt: null },
  });

  return NEWSLETTER_COUPON;
}

export async function listSubscribers() {
  return db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
}
