import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Award, Users, Truck, Target, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sobre a SUPZ",
  description:
    "Mais de 20 anos de mercado físico em suplementação esportiva. Conheça a história, o posicionamento e os valores da SUPZ.",
};

const MARCOS = [
  { ano: "2003", titulo: "A primeira loja", texto: "Uma loja de bairro em Limeira, atendendo frequentadores de academia da região." },
  { ano: "2011", titulo: "Expansão regional", texto: "Cinco unidades no interior paulista e uma equipe treinada em nutrição esportiva." },
  { ano: "2018", titulo: "Marca própria", texto: "Nasce a linha SUPZ Nutrition, produzida em parceria com fabricantes certificados." },
  { ano: "2026", titulo: "Loja online", texto: "Toda a curadoria e o atendimento do balcão, agora também no digital." },
];

const VALORES = [
  { icon: Award, titulo: "Qualidade certificada", texto: "Todo produto tem registro e segue as normas da ANVISA. Sem exceção." },
  { icon: Target, titulo: "Curadoria, não catálogo", texto: "Vendemos o que recomendaríamos para nossos próprios alunos e clientes." },
  { icon: Users, titulo: "Atendimento de gente", texto: "Quem responde entende de treino e de suplementação — não é robô." },
  { icon: Truck, titulo: "Entrega confiável", texto: "Produto lacrado, embalado com cuidado e rastreado do envio à porta." },
];

export default function Page() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary-dark via-primary to-primary-dark py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="text-sm font-bold uppercase tracking-widest text-accent">
            Sobre a SUPZ
          </span>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Mais de 20 anos ajudando gente
            <br />a treinar melhor
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Começamos atrás de um balcão, tirando dúvidas sobre whey e creatina.
            Duas décadas depois, a pergunta que guia a loja continua a mesma:
            isso aqui realmente ajuda quem vai tomar?
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src="/seed/sobre.jpg" alt="Atleta treinando" fill
              sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover"
            />
          </div>
          <div className="space-y-5">
            <h2 className="text-3xl font-black leading-tight">Nossa história</h2>
            <p className="leading-relaxed text-muted-foreground">
              A SUPZ nasceu em 2003 como uma loja de bairro em Limeira, no
              interior de São Paulo. O negócio cresceu no boca a boca: quem
              comprava voltava, e trazia junto o parceiro de treino.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Ao longo dos anos, montamos uma rede de unidades físicas e
              desenvolvemos linha própria em parceria com fabricantes
              certificados. A loja online é a continuação natural disso — mesma
              curadoria, mesmo atendimento, alcance maior.
            </p>
            <ul className="space-y-3 pt-2">
              {[
                "Mais de 50 mil clientes atendidos",
                "Linha própria com fabricação certificada",
                "Equipe formada em nutrição e educação física",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-success" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-surface py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-black">Nossa trajetória</h2>
          <ol className="relative space-y-8 border-l-2 pl-8">
            {MARCOS.map((m) => (
              <li key={m.ano} className="relative">
                <span className="absolute -left-[41px] flex size-5 items-center justify-center rounded-full border-4 border-surface bg-primary" />
                <p className="text-sm font-black text-primary">{m.ano}</p>
                <h3 className="mt-0.5 text-lg font-bold">{m.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-black">No que acreditamos</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALORES.map((v) => (
              <div key={v.titulo} className="rounded-2xl border bg-card p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <v.icon className="size-5" />
                </div>
                <h3 className="font-bold">{v.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {v.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-3xl font-black">Pronto para começar?</h2>
          <p className="mt-3 text-white/70">
            Explore o catálogo e encontre o que faz sentido para o seu treino.
          </p>
          <Button asChild size="lg" className="mt-6 bg-accent font-bold text-accent-foreground hover:bg-accent-hover">
            <Link href="/produtos">Ver produtos <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
