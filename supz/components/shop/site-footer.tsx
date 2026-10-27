import Link from "next/link";
import { Phone, Mail, MessageCircle, Clock } from "lucide-react";
import { NewsletterForm } from "@/components/shop/newsletter-form";

const INSTITUCIONAL = [
  { label: "Sobre nós", href: "/sobre" },
  { label: "Todos os produtos", href: "/produtos" },
  { label: "Política de privacidade", href: "/politicas/privacidade" },
  { label: "Termos de uso", href: "/politicas/termos-de-uso" },
  { label: "Trocas e devoluções", href: "/politicas/trocas-e-devolucoes" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <NewsletterForm />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-2xl font-black tracking-tight">SUPZ</p>
          <p className="text-sm leading-relaxed text-white/60">
            Mais de 20 anos de mercado físico em suplementação, agora também
            online. Produtos com qualidade certificada pela ANVISA.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Instagram", "Facebook", "YouTube"].map((rede) => (
              <span
                key={rede}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70"
              >
                {rede}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">
            Institucional
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            {INSTITUCIONAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">
            Atendimento
          </h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4 shrink-0" /> (19) 99999-0000
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" /> (19) 3232-1000
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" /> contato@supz.com.br
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" />
              <span>Seg. a sex., 8h às 18h<br />Sáb., 8h às 12h</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-accent">
            Formas de pagamento
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Pix</li>
            <li>Cartão de crédito em até 12x</li>
            <li>Boleto bancário</li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-white/40">
            Este é um projeto acadêmico de demonstração. Nenhuma compra é real e
            nenhum pagamento é processado.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SUPZ Suplementos — CNPJ 00.000.000/0001-00</p>
          <p>Projeto acadêmico. Produto sem finalidade comercial.</p>
        </div>
      </div>
    </footer>
  );
}
