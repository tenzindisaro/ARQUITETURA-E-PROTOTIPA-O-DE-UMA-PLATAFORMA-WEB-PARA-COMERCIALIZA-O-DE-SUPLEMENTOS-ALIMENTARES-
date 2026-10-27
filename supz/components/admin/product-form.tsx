"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { criarProduto, editarProduto } from "@/app/admin/actions";
import {
  productSchema,
  type ProductInput,
  type ProductFormValues,
} from "@/lib/validations/admin";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

interface Opcao { id: string; name: string }

export function ProductForm({
  productId,
  categories,
  brands,
  defaultValues,
}: {
  productId?: string;
  categories: Opcao[];
  brands: Opcao[];
  defaultValues?: Partial<ProductFormValues>;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  // Três genéricos porque o schema transforma: os campos carregam texto e o
  // servidor recebe números já convertidos.
  const form = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", slug: "", description: "", nutritionalInfo: "", usageInstructions: "",
      netWeight: "", categoryId: "", brandId: "", price: 0, salePrice: null,
      isActive: true, isFeatured: false, metaTitle: "", metaDescription: "",
      variants: [
        { name: "Sem Sabor", sku: "", priceDelta: 0, stock: 0, lowStockThreshold: 5, isActive: true },
      ],
      ...defaultValues,
    },
  });

  const variantes = useFieldArray({ control: form.control, name: "variants" });

  function onSubmit(values: ProductInput) {
    setErro(null);
    startTransition(async () => {
      const result = productId
        ? await editarProduto(productId, values)
        : await criarProduto(values);

      if (result.ok) {
        toast.success(productId ? "Produto atualizado" : "Produto criado");
        if (!productId && "data" in result) {
          router.push(`/admin/produtos/${(result.data as { id: string }).id}`);
        } else {
          router.refresh();
        }
      } else {
        if (result.field) {
          form.setError(result.field as keyof ProductFormValues, { message: result.message });
        }
        setErro(result.message);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {erro && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Informações básicas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do produto</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // O slug acompanha o nome enquanto o produto é novo.
                      if (!productId) form.setValue("slug", slugify(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>URL (slug)</FormLabel>
                <FormControl><Input {...field} className="font-mono" /></FormControl>
                <FormDescription>/produtos/{field.value || "..."}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="brandId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="netWeight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso / quantidade</FormLabel>
                  <FormControl><Input placeholder="900g" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="nutritionalInfo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações nutricionais</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="usageInstructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Modo de consumo</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Preço e exibição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de tabela (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number" step="0.01" min="0"
                      value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="salePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço promocional (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number" step="0.01" min="0" placeholder="deixe vazio se não houver"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Uma Flash Sale ativa tem precedência sobre este valor.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex flex-wrap gap-6">
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Produto ativo na loja</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="isFeatured" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Exibir em destaque na Home</FormLabel>
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="metaTitle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título SEO</FormLabel>
                  <FormControl><Input maxLength={70} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="metaDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição SEO</FormLabel>
                  <FormControl><Input maxLength={160} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Variantes e estoque</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada variante é uma unidade de estoque com SKU próprio. Produtos
                sem sabor têm uma única variante.
              </p>
            </div>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() =>
                variantes.append({
                  name: "", sku: "", priceDelta: 0, stock: 0,
                  lowStockThreshold: 5, isActive: true,
                })
              }
            >
              <Plus /> Variante
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {form.formState.errors.variants?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.variants.message}
              </p>
            )}

            {variantes.fields.map((campo, i) => (
              <div key={campo.id} className="grid items-end gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_110px_110px_110px_auto]">
                <FormField control={form.control} name={`variants.${i}.name`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Sabor</FormLabel>
                    <FormControl><Input placeholder="Chocolate" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`variants.${i}.sku`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">SKU</FormLabel>
                    <FormControl><Input className="font-mono" placeholder="SUPZ-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`variants.${i}.priceDelta`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Ajuste R$</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" value={field.value ?? 0}
                        onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`variants.${i}.stock`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" value={field.value ?? 0}
                        onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name={`variants.${i}.lowStockThreshold`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" value={field.value ?? 5}
                        onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button
                  type="button" variant="ghost" size="icon"
                  aria-label="Remover variante"
                  disabled={variantes.fields.length === 1}
                  onClick={() => variantes.remove(i)}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={pendente}>
            {pendente ? "Salvando..." : productId ? "Salvar alterações" : "Criar produto"}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
