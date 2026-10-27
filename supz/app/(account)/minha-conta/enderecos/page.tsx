import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listAddresses } from "@/lib/services/addresses";
import { AddressManager } from "@/components/shop/address-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meus endereços" };

export default async function Page() {
  const user = await requireUser("/minha-conta/enderecos");
  const enderecos = await listAddresses(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Meus endereços</h1>
        <p className="text-muted-foreground">
          Endereços salvos aparecem como opção no checkout.
        </p>
      </div>

      <AddressManager
        addresses={enderecos.map((a) => ({
          id: a.id, label: a.label, recipient: a.recipient, zipCode: a.zipCode,
          street: a.street, number: a.number, complement: a.complement,
          district: a.district, city: a.city, state: a.state, isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
