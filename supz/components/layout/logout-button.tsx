"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { sair } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const [pendente, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      disabled={pendente}
      onClick={() => startTransition(() => sair())}
    >
      <LogOut />
      {pendente ? "Saindo..." : "Sair"}
    </Button>
  );
}
