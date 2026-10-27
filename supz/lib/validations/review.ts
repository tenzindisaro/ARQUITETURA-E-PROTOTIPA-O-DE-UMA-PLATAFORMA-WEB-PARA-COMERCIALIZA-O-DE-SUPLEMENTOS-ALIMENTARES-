import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Escolha uma nota").max(5),
  title: z.string().trim().max(120).optional(),
  comment: z
    .string()
    .trim()
    .min(10, "Escreva ao menos 10 caracteres")
    .max(2000, "Comentário muito longo"),
});

export type ReviewFormInput = z.infer<typeof reviewSchema>;
