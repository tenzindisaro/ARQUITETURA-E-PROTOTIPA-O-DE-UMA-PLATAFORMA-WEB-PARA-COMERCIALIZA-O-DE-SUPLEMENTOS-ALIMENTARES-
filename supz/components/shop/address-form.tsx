"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { salvarEndereco, atualizarEndereco } from "@/app/(shop)/checkout/actions";
import { addressSchema, type AddressInput } from "@/lib/validations/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

function maskCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export function AddressForm({
  addressId,
  defaultValues,
  onSaved,
}: {
  addressId?: string;
  defaultValues?: Partial<AddressInput>;
  onSaved?: (id?: string) => void;
}) {
  const [pendente, startTransition] = useTransition();

  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Casa", recipient: "", zipCode: "", street: "", number: "",
      complement: "", district: "", city: "", state: "", isDefault: false,
      ...defaultValues,
    },
  });

  function onSubmit(values: AddressInput) {
    startTransition(async () => {
      if (addressId) {
        const result = await atualizarEndereco(addressId, values);
        if (result.ok) {
          toast.success("Endereço atualizado");
          onSaved?.(addressId);
        } else {
          if (result.field) {
            form.setError(result.field as keyof AddressInput, { message: result.message });
          }
          toast.error(result.message);
        }
        return;
      }

      const result = await salvarEndereco(values);
      if (result.ok) {
        toast.success("Endereço salvo");
        form.reset();
        onSaved?.(result.data.id);
      } else {
        if (result.field) {
          form.setError(result.field as keyof AddressInput, { message: result.message });
        }
        toast.error(result.message);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="label" render={({ field }) => (
            <FormItem>
              <FormLabel>Identificação</FormLabel>
              <FormControl><Input placeholder="Casa, Trabalho..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="recipient" render={({ field }) => (
            <FormItem>
              <FormLabel>Quem vai receber</FormLabel>
              <FormControl><Input autoComplete="name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <FormField control={form.control} name="zipCode" render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric" placeholder="00000-000" autoComplete="postal-code"
                  {...field} onChange={(e) => field.onChange(maskCep(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="street" render={({ field }) => (
            <FormItem>
              <FormLabel>Rua</FormLabel>
              <FormControl><Input autoComplete="address-line1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <FormField control={form.control} name="number" render={({ field }) => (
            <FormItem>
              <FormLabel>Número</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="complement" render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento (opcional)</FormLabel>
              <FormControl><Input placeholder="Apto, bloco..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_100px]">
          <FormField control={form.control} name="district" render={({ field }) => (
            <FormItem>
              <FormLabel>Bairro</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl><Input autoComplete="address-level2" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="state" render={({ field }) => (
            <FormItem>
              <FormLabel>UF</FormLabel>
              <FormControl>
                <Input
                  maxLength={2} placeholder="SP" className="uppercase"
                  {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="isDefault" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">Usar como endereço padrão</FormLabel>
          </FormItem>
        )} />

        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : addressId ? "Salvar alterações" : "Salvar endereço"}
        </Button>
      </form>
    </Form>
  );
}
