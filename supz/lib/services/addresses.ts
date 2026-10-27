import "server-only";
import { db } from "@/lib/db";
import { ServiceError } from "@/lib/services/auth";
import type { AddressInput } from "@/lib/validations/checkout";

export async function listAddresses(userId: string) {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAddress(userId: string, addressId: string) {
  return db.address.findFirst({ where: { id: addressId, userId } });
}

export async function createAddress(userId: string, input: AddressInput) {
  const primeiro = (await db.address.count({ where: { userId } })) === 0;
  const padrao = input.isDefault || primeiro;

  return db.$transaction(async (tx) => {
    if (padrao) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: {
        userId,
        label: input.label,
        recipient: input.recipient,
        zipCode: input.zipCode,
        street: input.street,
        number: input.number,
        complement: input.complement || null,
        district: input.district,
        city: input.city,
        state: input.state,
        isDefault: padrao,
      },
    });
  });
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput) {
  const existente = await getAddress(userId, addressId);
  if (!existente) throw new ServiceError("Endereço não encontrado.");

  return db.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.update({
      where: { id: addressId },
      data: {
        label: input.label,
        recipient: input.recipient,
        zipCode: input.zipCode,
        street: input.street,
        number: input.number,
        complement: input.complement || null,
        district: input.district,
        city: input.city,
        state: input.state,
        isDefault: input.isDefault ?? existente.isDefault,
      },
    });
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const existente = await getAddress(userId, addressId);
  if (!existente) throw new ServiceError("Endereço não encontrado.");

  // Pedidos guardam cópia do endereço, então apagar não afeta o histórico.
  await db.address.delete({ where: { id: addressId } });
}
