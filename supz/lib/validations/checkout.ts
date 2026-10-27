import { z } from "zod";
import { SHIPPING_METHODS } from "@/lib/shipping";

const digits = (v: string) => v.replace(/\D/g, "");

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const addressSchema = z.object({
  label: z.string().trim().min(2, "Dê um nome ao endereço").max(40),
  recipient: z.string().trim().min(3, "Informe quem vai receber").max(120),
  zipCode: z
    .string()
    .trim()
    .refine((v) => digits(v).length === 8, { message: "CEP deve ter 8 dígitos" })
    .transform(digits),
  street: z.string().trim().min(3, "Informe a rua").max(160),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  district: z.string().trim().min(2, "Informe o bairro").max(80),
  city: z.string().trim().min(2, "Informe a cidade").max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => (UFS as readonly string[]).includes(v), { message: "UF inválida" }),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

const shippingIds = SHIPPING_METHODS.map((m) => m.id) as [string, ...string[]];

export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Escolha um endereço de entrega"),
  shippingMethod: z.enum(shippingIds),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
