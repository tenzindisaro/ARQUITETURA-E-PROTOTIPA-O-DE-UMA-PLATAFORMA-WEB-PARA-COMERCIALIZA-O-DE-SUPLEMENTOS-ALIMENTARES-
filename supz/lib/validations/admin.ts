import { z } from "zod";

const preco = z
  .union([z.number(), z.string()])
  .transform((v) => Number(String(v).replace(",", ".")))
  .refine((v) => Number.isFinite(v) && v >= 0, { message: "Preço inválido" });

/**
 * Inteiro vindo de <input type="number">, que sempre entrega texto.
 * `z.coerce.number()` teria entrada `unknown`, o que impede tipar o formulário.
 */
const inteiro = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((v) => Number.isInteger(v), { message: "Informe um número inteiro" });

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o sabor").max(60),
  sku: z.string().trim().min(3, "SKU muito curto").max(40),
  priceDelta: preco.default(0),
  stock: inteiro.refine((v) => v >= 0, { message: "Estoque não pode ser negativo" }),
  lowStockThreshold: inteiro.refine((v) => v >= 0).default(5),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(3, "Informe o nome").max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens")
      .max(180),
    description: z.string().trim().min(20, "Descreva o produto em ao menos 20 caracteres"),
    nutritionalInfo: z.string().trim().max(2000).optional().or(z.literal("")),
    usageInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
    netWeight: z.string().trim().max(40).optional().or(z.literal("")),
    categoryId: z.string().min(1, "Escolha a categoria"),
    brandId: z.string().min(1, "Escolha a marca"),
    price: preco,
    salePrice: preco.optional().nullable(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    metaTitle: z.string().trim().max(70).optional().or(z.literal("")),
    metaDescription: z.string().trim().max(160).optional().or(z.literal("")),
    variants: z.array(variantSchema).min(1, "O produto precisa de ao menos uma variante"),
  })
  .refine((d) => d.salePrice == null || d.salePrice < d.price, {
    message: "O preço promocional tem de ser menor que o preço de tabela",
    path: ["salePrice"],
  })
  .refine(
    (d) => new Set(d.variants.map((v) => v.name.toLowerCase())).size === d.variants.length,
    { message: "Existem variantes com o mesmo nome", path: ["variants"] },
  );

/** Saída do schema — o que o servidor recebe, já convertido. */
export type ProductInput = z.output<typeof productSchema>;
/** Entrada do schema — o que os campos do formulário carregam (preço como texto). */
export type ProductFormValues = z.input<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens")
    .max(90),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  sortOrder: inteiro.refine((v) => v >= 0).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.output<typeof categorySchema>;
export type CategoryFormValues = z.input<typeof categorySchema>;

export const brandSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens")
    .max(90),
  isActive: z.boolean().default(true),
});

export type BrandInput = z.output<typeof brandSchema>;
export type BrandFormValues = z.input<typeof brandSchema>;

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, "Use de 3 a 20 letras e números, sem espaços"),
    description: z.string().trim().max(160).optional().or(z.literal("")),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: preco.refine((v) => v > 0, { message: "O desconto deve ser maior que zero" }),
    minOrderTotal: preco.optional().nullable(),
    maxDiscount: preco.optional().nullable(),
    expiresAt: z.string().optional().or(z.literal("")),
    usageLimit: inteiro.refine((v) => v >= 1).optional().nullable(),
    usageLimitPerUser: inteiro.refine((v) => v >= 1).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.discountType !== "PERCENTAGE" || d.discountValue <= 100, {
    message: "Desconto percentual não pode passar de 100%",
    path: ["discountValue"],
  });

export type CouponInput = z.output<typeof couponSchema>;
export type CouponFormValues = z.input<typeof couponSchema>;

export const stockAdjustmentSchema = z.object({
  variantId: z.string().min(1),
  /** Quantidade a somar (positiva) ou subtrair (negativa) do saldo atual. */
  delta: inteiro.refine((v) => v !== 0, { message: "Informe uma quantidade" }),
  reason: z.string().trim().min(3, "Descreva o motivo").max(160),
});

export type StockAdjustmentInput = z.output<typeof stockAdjustmentSchema>;
export type StockAdjustmentFormValues = z.input<typeof stockAdjustmentSchema>;
