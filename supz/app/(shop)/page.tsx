import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Flame, Truck, Shield, Award, Package, Check, Zap, ChevronRight,
} from "lucide-react";
import { getFeaturedProducts, getCategories } from "@/lib/services/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { FlashSaleSection } from "@/components/shop/flash-sale-section";
import { StarRating } from "@/components/shop/star-rating";
import { Button } from "@/components/ui/button";

// Vitrine mostra preço e estoque ao vivo: nunca prerenderizada no build.
export const dynamic = "force-dynamic";

const GARANTIAS = [
  { icon: Truck, title: "Frete grátis", desc: "Em pedidos acima de R$ 299" },
  { icon: Shield, title: "Compra segura", desc: "100% protegida e garantida" },
  { icon: Award, title: "Qualidade ANVISA", desc: "Produtos certificados" },
  { icon: Package, title: "Devolução fácil", desc: "30 dias para trocar" },
];

const DEPOIMENTOS = [
  {
    nome: "Rafael Oliveira",
    papel: "Personal Trainer",
    texto:
      "A qualidade dos produtos SUPZ é incomparável. Uso o Whey Protein há 6 meses e os resultados são visíveis. Recomendo para todos os meus alunos.",
  },
  {
    nome: "Camila Ferreira",
    papel: "Atleta de CrossFit",
    texto:
      "Entrega rápida, produtos lacrados e com certificação ANVISA. A creatina monohidratada é a melhor que já tomei. Performance melhorou muito!",
  },
  {
    nome: "Lucas Mendonça",
    papel: "Fisiculturista",
    texto:
      "Preço justo, qualidade premium. O Pré-Treino Extremo é simplesmente o melhor do mercado. Foco e energia do início ao fim do treino.",
  },
];

export default async function Page() {
  const [destaques, categorias] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[540px] items-center overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-dark">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 size-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 size-72 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-0">
          <div className="z-10 space-y-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
              <Flame className="size-4 text-accent" />
              Ofertas da semana — até 40% OFF
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Eleve seu <span className="text-accent">desempenho</span> ao próximo nível
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-white/80">
              Suplementos premium com qualidade certificada pela ANVISA.
              Proteínas, creatinas e muito mais para quem treina de verdade.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-accent font-bold text-accent-foreground hover:bg-accent-hover"
              >
                <Link href="/produtos">
                  Comprar agora <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="#destaques">Ver ofertas</Link>
              </Button>
            </div>

            <div className="flex gap-8 pt-4">
              {[
                { valor: "50k+", rotulo: "Clientes" },
                { valor: "200+", rotulo: "Produtos" },
                { valor: "4.9★", rotulo: "Avaliação" },
              ].map((s) => (
                <div key={s.rotulo}>
                  <p className="text-2xl font-black text-accent">{s.valor}</p>
                  <p className="text-sm text-white/60">{s.rotulo}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 scale-90 rounded-3xl bg-accent/20 blur-2xl" />
              <Image
                src="/seed/hero.jpg"
                alt="Atleta de alta performance"
                width={700}
                height={700}
                priority
                className="relative aspect-square w-full rounded-3xl object-cover shadow-2xl"
              />
              <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-xl">
                <div className="flex size-10 items-center justify-center rounded-xl bg-success/15">
                  <Check className="size-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Qualidade</p>
                  <p className="text-sm font-bold">Certificado ANVISA</p>
                </div>
              </div>
              <div className="absolute -right-4 -top-4 flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-xl">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15">
                  <Zap className="size-5 text-accent-hover" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entrega</p>
                  <p className="text-sm font-bold">Em até 24h</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Garantias */}
      <section className="border-b bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {GARANTIAS.map((g) => (
            <div key={g.title} className="flex items-center gap-3 p-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <g.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{g.title}</p>
                <p className="text-xs text-muted-foreground">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/produtos"
              className="whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Todos
            </Link>
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/categorias/${c.slug}`}
                className="whitespace-nowrap rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FlashSaleSection />

      {/* Destaques */}
      <section id="destaques" className="bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">Produtos em destaque</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Os mais procurados por quem leva o treino a sério
              </p>
            </div>
            <Button asChild variant="outline" className="hidden sm:flex">
              <Link href="/produtos">
                Ver todos <ChevronRight />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {destaques.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline">
              <Link href="/produtos">Ver todos os produtos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section className="bg-background py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src="/seed/sobre.jpg"
              alt="Atleta treinando"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent" />
          </div>

          <div className="space-y-6">
            <span className="text-sm font-bold uppercase tracking-widest text-primary">
              Sobre a SUPZ
            </span>
            <h2 className="text-4xl font-black leading-tight">
              Ciência e performance
              <br />
              em cada produto
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              São mais de 20 anos de mercado físico em suplementação esportiva,
              atendendo atletas, praticantes e profissionais. Toda essa
              experiência agora também online, com a mesma curadoria de produtos
              e o mesmo atendimento.
            </p>
            <ul className="space-y-3">
              {[
                "Produtos com registro e certificação ANVISA",
                "Curadoria feita por quem entende de treino",
                "Entrega rápida e rastreada para todo o Brasil",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-success" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg">
              <Link href="/sobre">
                Conhecer a SUPZ <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-primary">
              Depoimentos
            </span>
            <h2 className="mt-2 text-3xl font-black">O que nossos clientes dizem</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {DEPOIMENTOS.map((d) => (
              <figure key={d.nome} className="rounded-2xl border bg-card p-6">
                <StarRating rating={5} className="mb-4" />
                <blockquote className="text-sm leading-relaxed text-muted-foreground">
                  “{d.texto}”
                </blockquote>
                <figcaption className="mt-5 border-t pt-4">
                  <p className="text-sm font-bold">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">{d.papel}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
