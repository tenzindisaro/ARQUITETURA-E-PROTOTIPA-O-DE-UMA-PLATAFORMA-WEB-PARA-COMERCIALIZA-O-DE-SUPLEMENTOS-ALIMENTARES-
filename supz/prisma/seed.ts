import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  DiscountType,
  StockMovementType,
  type Product,
  type ProductVariant,
} from "./generated/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// ─────────────────────────── helpers ───────────────────────────

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(now.getTime() + n * DAY);
const hoursAhead = (n: number) => new Date(now.getTime() + n * HOUR);

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Apaga tudo respeitando as chaves estrangeiras. */
async function reset() {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "StockMovement", "OrderStatusHistory", "CouponRedemption", "Payment",
      "OrderItem", "Order", "Review", "Favorite", "CartItem", "Cart",
      "FlashSaleItem", "FlashSale", "ProductImage", "ProductVariant",
      "Product", "Category", "Brand", "Coupon", "PasswordResetToken",
      "User", "NewsletterSubscriber"
    RESTART IDENTITY CASCADE
  `);
}

// ─────────────────────────── catálogo ──────────────────────────

const CATEGORIES = [
  { name: "Proteínas", description: "Whey concentrado e isolado para complementar a ingestão proteica." },
  { name: "Creatina", description: "Creatina monohidratada para uso diário." },
  { name: "Pré-treino", description: "Pós para preparo de bebida antes do treino." },
  { name: "Aminoácidos", description: "BCAA e glutamina em pó." },
  { name: "Vitaminas", description: "Complexos de vitaminas e minerais." },
  { name: "Colágeno", description: "Colágeno hidrolisado em pó." },
  { name: "Hipercalóricos", description: "Complemento da ingestão energética." },
  { name: "Ômega 3", description: "Óleo de peixe em cápsulas." },
];

const BRANDS = [
  "Nuvora Nutrition",
  "VittaForge",
  "Altiva Labs",
  "Corevia",
  "Zenova",
  "Ironleaf",
  "Movena",
  "Nutrakor",
  "Orvix",
  "Fynex",
];

type SeedProduct = {
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  salePrice?: number;
  image: string;
  netWeight: string;
  description: string;
  nutritionalInfo: string;
  usageInstructions: string;
  metaTitle: string;
  metaDescription: string;
  featured?: boolean;
  /** [sabor, SKU, estoque, mínimo] — cada produto tem uma única variante. */
  variant: [string, string, number, number];
};

/**
 * Catálogo de demonstração, transcrito de docs/produtos.md.
 * Marcas e produtos são fictícios, criados para esta apresentação.
 */
const PRODUCTS: SeedProduct[] = [
  {
    name: "Creatina Monohidratada PureCore 300g",
    slug: "creatina-monohidratada-purecore-300g",
    category: "Creatina",
    brand: "Nuvora Nutrition",
    price: 89.9,
    salePrice: 74.9,
    image: "creatina-purecore",
    netWeight: "300g",
    featured: true,
    description:
      "Creatina monohidratada em pó, desenvolvida para fácil mistura e uso diário. Fórmula simples, sem adição de sabor.",
    nutritionalInfo: "Porção de 3g: Creatina monohidratada 3g.",
    usageInstructions:
      "Diluir 3g em água ou bebida de sua preferência. Consumir conforme orientação profissional.",
    metaTitle: "Creatina Monohidratada PureCore 300g | Nuvora Nutrition",
    metaDescription:
      "Creatina monohidratada em pó com 300g. Produto fictício para demonstração de loja.",
    variant: ["Sem sabor", "NUV-CREA-300", 80, 5],
  },
  {
    name: "Whey Protein Concentrado ChocoFuel 900g",
    slug: "whey-protein-concentrado-chocofuel-900g",
    category: "Proteínas",
    brand: "VittaForge",
    price: 139.9,
    salePrice: 119.9,
    image: "whey-chocofuel",
    netWeight: "900g",
    featured: true,
    description:
      "Whey protein concentrado sabor chocolate, com textura cremosa e fácil preparo. Ideal para complementar a alimentação diária.",
    nutritionalInfo: "Porção de 30g: Proteínas 21g; Carboidratos 4g; Gorduras 2g.",
    usageInstructions: "Misturar 30g em aproximadamente 200ml de água ou leite.",
    metaTitle: "Whey Protein ChocoFuel 900g | VittaForge",
    metaDescription: "Whey protein concentrado sabor chocolate em embalagem de 900g.",
    variant: ["Chocolate", "VTF-WHEY-CHO-900", 45, 5],
  },
  {
    name: "Pré-Treino Ignite Citrus 300g",
    slug: "pre-treino-ignite-citrus-300g",
    category: "Pré-treino",
    brand: "Altiva Labs",
    price: 99.9,
    salePrice: 84.9,
    image: "pre-treino-ignite",
    netWeight: "300g",
    featured: true,
    description:
      "Pó para preparo de bebida sabor cítrico, criado para complementar a rotina de treinamento.",
    nutritionalInfo: "Porção de 10g: Carboidratos 2g; Cafeína 150mg.",
    usageInstructions:
      "Misturar uma porção em água. Não exceder a porção recomendada na embalagem.",
    metaTitle: "Pré-Treino Ignite Citrus 300g | Altiva Labs",
    metaDescription: "Suplemento pré-treino sabor cítrico em pó, embalagem de 300g.",
    variant: ["Citrus", "ATL-IGN-CIT-300", 32, 3],
  },
  {
    name: "BCAA 2:1:1 AminoWave Tropical 200g",
    slug: "bcaa-amino-wave-tropical-200g",
    category: "Aminoácidos",
    brand: "Corevia",
    price: 79.9,
    salePrice: 64.9,
    image: "bcaa-aminowave",
    netWeight: "200g",
    featured: true,
    description: "Mistura em pó de aminoácidos de cadeia ramificada com sabor tropical.",
    nutritionalInfo:
      "Porção de 5g: L-leucina 2,5g; L-isoleucina 1,25g; L-valina 1,25g.",
    usageInstructions:
      "Misturar uma porção em água e consumir conforme a rotina alimentar.",
    metaTitle: "BCAA AminoWave Tropical 200g | Corevia",
    metaDescription: "BCAA 2:1:1 sabor tropical em pó, embalagem de 200g.",
    variant: ["Tropical", "CRV-BCAA-TRO-200", 60, 5],
  },
  {
    name: "Multivitamínico Daily One 60 Cápsulas",
    slug: "multivitaminico-daily-one-60-capsulas",
    category: "Vitaminas",
    brand: "Zenova",
    price: 69.9,
    salePrice: 59.9,
    image: "multivitaminico-daily-one",
    netWeight: "60 cápsulas",
    featured: true,
    description:
      "Complexo de vitaminas e minerais desenvolvido para complementar uma alimentação equilibrada.",
    nutritionalInfo:
      "Porção de 2 cápsulas: Vitamina C 45mg; Vitamina D 10µg; Zinco 7mg; Magnésio 65mg.",
    usageInstructions:
      "Consumir 2 cápsulas ao dia, preferencialmente junto às refeições.",
    metaTitle: "Multivitamínico Daily One 60 Cápsulas | Zenova",
    metaDescription:
      "Complexo de vitaminas e minerais em cápsulas para complementar a alimentação.",
    variant: ["Sem sabor", "ZNV-MULT-60", 75, 5],
  },
  {
    name: "L-Glutamina Recovery 300g",
    slug: "l-glutamina-recovery-300g",
    category: "Aminoácidos",
    brand: "Ironleaf",
    price: 84.9,
    salePrice: 72.9,
    image: "glutamina-recovery",
    netWeight: "300g",
    description:
      "L-glutamina em pó de sabor neutro, prática para adicionar à rotina alimentar.",
    nutritionalInfo: "Porção de 5g: L-glutamina 5g.",
    usageInstructions: "Misturar 5g em água ou outra bebida de sua preferência.",
    metaTitle: "L-Glutamina Recovery 300g | Ironleaf",
    metaDescription: "L-glutamina em pó sem sabor, embalagem de 300g.",
    variant: ["Sem sabor", "IRL-GLU-300", 41, 5],
  },
  {
    name: "Colágeno Hidrolisado Beauty Berry 300g",
    slug: "colageno-hidrolisado-beauty-berry-300g",
    category: "Colágeno",
    brand: "Movena",
    price: 94.9,
    salePrice: 79.9,
    image: "colageno-beauty-berry",
    netWeight: "300g",
    featured: true,
    description:
      "Pó de colágeno hidrolisado sabor frutas vermelhas, pensado para complementar a rotina alimentar.",
    nutritionalInfo: "Porção de 10g: Proteínas 9g; Vitamina C 45mg.",
    usageInstructions: "Misturar uma porção em aproximadamente 200ml de água.",
    metaTitle: "Colágeno Beauty Berry 300g | Movena",
    metaDescription: "Colágeno hidrolisado sabor frutas vermelhas em pó.",
    variant: ["Frutas vermelhas", "MOV-COL-BER-300", 55, 5],
  },
  {
    name: "Hipercalórico MassUp Vanilla 1kg",
    slug: "hipercalorico-massup-vanilla-1kg",
    category: "Hipercalóricos",
    brand: "Nutrakor",
    price: 119.9,
    salePrice: 99.9,
    image: "hipercalorico-massup",
    netWeight: "1kg",
    description:
      "Pó para preparo de bebida sabor baunilha, desenvolvido para complementar a ingestão energética da alimentação.",
    nutritionalInfo: "Porção de 100g: Proteínas 20g; Carboidratos 70g; Gorduras 5g.",
    usageInstructions: "Misturar uma porção em água ou leite conforme preferência.",
    metaTitle: "Hipercalórico MassUp Vanilla 1kg | Nutrakor",
    metaDescription: "Hipercalórico sabor baunilha em pó, embalagem de 1kg.",
    variant: ["Baunilha", "NTK-MASS-VAN-1K", 28, 3],
  },
  {
    name: "Whey Protein Isolado RedBerry 900g",
    slug: "whey-protein-isolado-redberry-900g",
    category: "Proteínas",
    brand: "Orvix",
    price: 179.9,
    salePrice: 149.9,
    image: "whey-redberry",
    netWeight: "900g",
    featured: true,
    description:
      "Whey protein isolado sabor morango, com perfil proteico e preparo prático.",
    nutritionalInfo: "Porção de 30g: Proteínas 25g; Carboidratos 1g; Gorduras 0,5g.",
    usageInstructions: "Misturar 30g em 200ml de água ou leite.",
    metaTitle: "Whey Protein Isolado RedBerry 900g | Orvix",
    metaDescription: "Whey protein isolado sabor morango em embalagem de 900g.",
    variant: ["Morango", "ORV-WPI-MOR-900", 36, 5],
  },
  {
    name: "Ômega 3 OceanPure 120 Cápsulas",
    slug: "omega-3-oceanpure-120-capsulas",
    category: "Ômega 3",
    brand: "Fynex",
    price: 89.9,
    salePrice: 74.9,
    image: "omega3-oceanpure",
    netWeight: "120 cápsulas",
    description:
      "Suplemento de óleo de peixe em cápsulas, apresentado em embalagem prática para uso diário.",
    nutritionalInfo:
      "Porção de 2 cápsulas: Óleo de peixe 2.000mg; EPA 360mg; DHA 240mg.",
    usageInstructions: "Consumir 2 cápsulas ao dia junto a uma refeição.",
    metaTitle: "Ômega 3 OceanPure 120 Cápsulas | Fynex",
    metaDescription:
      "Ômega 3 em cápsulas com EPA e DHA, embalagem com 120 unidades.",
    variant: ["Sem sabor", "FYN-OMEGA-120", 90, 5],
  },
];

// ─────────────────────────── execução ──────────────────────────

async function main() {
  console.log("Limpando o banco...");
  await reset();

  // ── usuários ──────────────────────────────────────────────
  console.log("Criando usuários...");
  const senha = await bcrypt.hash("supz1234", 10);

  const admin = await db.user.create({
    data: {
      name: "Administrador SUPZ",
      email: "admin@supz.com.br",
      passwordHash: senha,
      cpf: "11122233344",
      phone: "(19) 3232-1000",
      role: Role.ADMIN,
    },
  });

  const clientes = await Promise.all(
    [
      {
        name: "João da Silva",
        email: "joao@email.com",
        cpf: "12345678901",
        phone: "(19) 99999-1111",
        address: {
          label: "Casa",
          recipient: "João da Silva",
          zipCode: "13480100",
          street: "Rua das Palmeiras",
          number: "245",
          complement: "Apto 32",
          district: "Centro",
          city: "Limeira",
          state: "SP",
        },
      },
      {
        name: "Camila Ferreira",
        email: "camila@email.com",
        cpf: "98765432100",
        phone: "(11) 98888-2222",
        address: {
          label: "Casa",
          recipient: "Camila Ferreira",
          zipCode: "01310200",
          street: "Avenida Paulista",
          number: "1500",
          complement: "Bloco B, Apto 71",
          district: "Bela Vista",
          city: "São Paulo",
          state: "SP",
        },
      },
      {
        name: "Rafael Oliveira",
        email: "rafael@email.com",
        cpf: "45678912300",
        phone: "(19) 97777-3333",
        address: {
          label: "Trabalho",
          recipient: "Rafael Oliveira",
          zipCode: "13084970",
          street: "Rua Doutor Ricardo Benetton",
          number: "88",
          district: "Barão Geraldo",
          city: "Campinas",
          state: "SP",
        },
      },
    ].map(({ address, ...user }) =>
      db.user.create({
        data: {
          ...user,
          passwordHash: senha,
          role: Role.CUSTOMER,
          addresses: { create: { ...address, isDefault: true } },
        },
        include: { addresses: true },
      }),
    ),
  );

  // ── catálogo ──────────────────────────────────────────────
  console.log("Criando categorias e marcas...");
  const categorias = new Map<string, string>();
  for (const [i, cat] of CATEGORIES.entries()) {
    const created = await db.category.create({
      data: { ...cat, slug: slugify(cat.name), sortOrder: i },
    });
    categorias.set(cat.name, created.id);
  }

  const marcas = new Map<string, string>();
  for (const name of BRANDS) {
    const created = await db.brand.create({ data: { name, slug: slugify(name) } });
    marcas.set(name, created.id);
  }

  console.log(`Criando ${PRODUCTS.length} produtos...`);
  const produtosCriados: Array<Product & { variants: ProductVariant[] }> = [];

  for (const p of PRODUCTS) {
    const [sabor, sku, estoque, minimo] = p.variant;

    const produto = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        nutritionalInfo: p.nutritionalInfo,
        usageInstructions: p.usageInstructions,
        netWeight: p.netWeight,
        categoryId: categorias.get(p.category)!,
        brandId: marcas.get(p.brand)!,
        price: p.price,
        salePrice: p.salePrice ?? null,
        isFeatured: p.featured ?? false,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        images: {
          create: {
            url: `/seed/produto-${p.image}.jpg`,
            altText: p.name,
            isPrimary: true,
            sortOrder: 0,
          },
        },
        variants: {
          create: {
            sku,
            name: sabor,
            stock: estoque,
            lowStockThreshold: minimo,
            priceDelta: 0,
            sortOrder: 0,
          },
        },
      },
      include: { variants: true },
    });

    // Entrada de estoque inicial, para que o histórico feche com o saldo.
    await db.stockMovement.createMany({
      data: produto.variants.map((v: ProductVariant) => ({
        variantId: v.id,
        type: StockMovementType.INBOUND,
        quantity: v.stock,
        stockAfter: v.stock,
        reason: "Carga inicial de estoque",
        createdById: admin.id,
      })),
    });

    produtosCriados.push(produto);
  }

  const porSlug = (slug: string) => {
    const p = produtosCriados.find((x) => x.slug === slug);
    if (!p) throw new Error(`Produto não encontrado no seed: ${slug}`);
    return p;
  };

  // ── cupons ────────────────────────────────────────────────
  console.log("Criando cupons...");
  const cupomBoasVindas = await db.coupon.create({
    data: {
      code: "SUPZ10",
      description: "10% OFF na primeira compra — cadastro na newsletter",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscount: 50,
      usageLimitPerUser: 1,
      expiresAt: daysAhead(90),
    },
  });

  await db.coupon.createMany({
    data: [
      {
        code: "FRETEGRATIS",
        description: "Abate R$ 15,00 do frete em pedidos acima de R$ 150",
        discountType: DiscountType.FIXED,
        discountValue: 15,
        minOrderTotal: 150,
        usageLimit: 200,
        usageLimitPerUser: 2,
        expiresAt: daysAhead(30),
      },
      {
        code: "BLACKWEEK",
        description: "20% OFF — Black Week (encerrado)",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maxDiscount: 200,
        startsAt: daysAgo(40),
        expiresAt: daysAgo(10),
        usageLimit: 500,
      },
      {
        code: "INATIVO5",
        description: "Cupom desativado pelo administrador",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 5,
        isActive: false,
      },
    ],
  });

  // ── promoções relâmpago ───────────────────────────────────
  console.log("Criando Flash Sales...");
  const flashAtiva = await db.flashSale.create({
    data: {
      name: "Flash Sale — Ofertas do dia",
      startsAt: daysAgo(1),
      endsAt: hoursAhead(8),
      items: {
        create: [
          { productId: porSlug("creatina-monohidratada-purecore-300g").id, promoPrice: 64.9, stockLimit: 60, soldCount: 41 },
          { productId: porSlug("whey-protein-concentrado-chocofuel-900g").id, promoPrice: 99.9, stockLimit: 40, soldCount: 27 },
          { productId: porSlug("pre-treino-ignite-citrus-300g").id, promoPrice: 69.9, stockLimit: 30, soldCount: 22 },
          { productId: porSlug("bcaa-amino-wave-tropical-200g").id, promoPrice: 54.9, stockLimit: 25, soldCount: 9 },
        ],
      },
    },
  });

  await db.flashSale.create({
    data: {
      name: "Flash Sale — Semana passada (encerrada)",
      startsAt: daysAgo(9),
      endsAt: daysAgo(8),
      items: {
        create: [{ productId: porSlug("colageno-hidrolisado-beauty-berry-300g").id, promoPrice: 69.9, stockLimit: 50, soldCount: 50 }],
      },
    },
  });

  // ── pedidos ───────────────────────────────────────────────
  console.log("Criando pedidos...");

  type ItemPedido = { slug: string; qtd: number };

  async function criarPedido(opts: {
    cliente: (typeof clientes)[number];
    itens: ItemPedido[];
    status: OrderStatus;
    metodo: PaymentMethod;
    diasAtras: number;
    frete: number;
    cupom?: { id: string; code: string; desconto: number };
  }) {
    const criadoEm = daysAgo(opts.diasAtras);
    const endereco = opts.cliente.addresses[0];

    const itens = [];
    for (const it of opts.itens) {
      const produto = porSlug(it.slug);
      const variante = produto.variants[0];
      if (!variante) throw new Error(`Produto ${it.slug} não tem variante`);

      const listPrice = Number(produto.price) + Number(variante.priceDelta);
      const unitPrice = Number(produto.salePrice ?? produto.price) + Number(variante.priceDelta);

      itens.push({
        variantId: variante.id,
        productName: produto.name,
        variantName: variante.name,
        brandName: BRANDS.find((b) => marcas.get(b) === produto.brandId)!,
        sku: variante.sku,
        productSlug: produto.slug,
        imageUrl: `/seed/produto-${PRODUCTS.find((x) => x.slug === it.slug)!.image}.jpg`,
        unitPrice,
        listPrice,
        quantity: it.qtd,
        lineTotal: Number((unitPrice * it.qtd).toFixed(2)),
      });
    }

    const subtotal = Number(itens.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const desconto = opts.cupom?.desconto ?? 0;
    const total = Number((subtotal - desconto + opts.frete).toFixed(2));
    const cancelado = opts.status === OrderStatus.CANCELLED;
    const pago = !cancelado && opts.status !== OrderStatus.PENDING_PAYMENT;

    const pedido = await db.order.create({
      data: {
        userId: opts.cliente.id,
        status: opts.status,
        addressId: endereco.id,
        shipRecipient: endereco.recipient,
        shipZipCode: endereco.zipCode,
        shipStreet: endereco.street,
        shipNumber: endereco.number,
        shipComplement: endereco.complement,
        shipDistrict: endereco.district,
        shipCity: endereco.city,
        shipState: endereco.state,
        shippingMethod: opts.frete === 29.9 ? "Expressa" : "Padrão",
        subtotal,
        discountTotal: desconto,
        shippingTotal: opts.frete,
        total,
        couponId: opts.cupom?.id ?? null,
        couponCode: opts.cupom?.code ?? null,
        createdAt: criadoEm,
        paidAt: pago ? new Date(criadoEm.getTime() + 2 * HOUR) : null,
        cancelledAt: cancelado ? new Date(criadoEm.getTime() + DAY) : null,
        items: { create: itens },
        payment: {
          create: {
            method: opts.metodo,
            amount: total,
            status: cancelado
              ? PaymentStatus.CANCELLED
              : pago
                ? PaymentStatus.APPROVED
                : PaymentStatus.PENDING,
            externalId: `SIM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            paidAt: pago ? new Date(criadoEm.getTime() + 2 * HOUR) : null,
            createdAt: criadoEm,
          },
        },
      },
      include: { items: true },
    });

    // Linha do tempo coerente com o status atual (PRD §17).
    const FLUXO: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];
    const trilha: OrderStatus[] = cancelado
      ? [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED]
      : FLUXO.slice(0, FLUXO.indexOf(opts.status) + 1);

    const notas: Record<string, string> = {
      PENDING_PAYMENT: "Pedido realizado",
      PAID: "Pagamento aprovado",
      PROCESSING: "Em preparação",
      SHIPPED: "Enviado",
      DELIVERED: "Entregue",
      CANCELLED: "Pedido cancelado",
    };

    for (const [i, s] of trilha.entries()) {
      await db.orderStatusHistory.create({
        data: {
          orderId: pedido.id,
          status: s,
          note: notas[s],
          changedById: i === 0 ? null : admin.id,
          createdAt: new Date(criadoEm.getTime() + i * DAY),
        },
      });
    }

    // Baixa de estoque + movimentação, como no checkout real.
    if (!cancelado) {
      for (const item of pedido.items) {
        if (!item.variantId) continue;
        const v = await db.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
        await db.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: StockMovementType.SALE,
            quantity: item.quantity,
            stockAfter: v.stock,
            reason: "Venda",
            orderId: pedido.id,
            createdAt: criadoEm,
          },
        });
        await db.product.update({
          where: { slug: item.productSlug },
          data: { soldCount: { increment: item.quantity } },
        });
      }
    }

    if (opts.cupom) {
      await db.coupon.update({
        where: { id: opts.cupom.id },
        data: { usedCount: { increment: 1 } },
      });
      await db.couponRedemption.create({
        data: {
          couponId: opts.cupom.id,
          userId: opts.cliente.id,
          orderId: pedido.id,
          amount: opts.cupom.desconto,
          createdAt: criadoEm,
        },
      });
    }

    return pedido;
  }

  const [joao, camila, rafael] = clientes;

  const entregue1 = await criarPedido({
    cliente: joao,
    itens: [
      { slug: "whey-protein-concentrado-chocofuel-900g", qtd: 2 },
      { slug: "creatina-monohidratada-purecore-300g", qtd: 1 },
    ],
    status: OrderStatus.DELIVERED,
    metodo: PaymentMethod.PIX,
    diasAtras: 24,
    frete: 0,
    cupom: { id: cupomBoasVindas.id, code: "SUPZ10", desconto: 22.97 },
  });

  const entregue2 = await criarPedido({
    cliente: camila,
    itens: [
      { slug: "creatina-monohidratada-purecore-300g", qtd: 2 },
      { slug: "multivitaminico-daily-one-60-capsulas", qtd: 1 },
    ],
    status: OrderStatus.DELIVERED,
    metodo: PaymentMethod.CREDIT_CARD,
    diasAtras: 18,
    frete: 15,
  });

  const entregue3 = await criarPedido({
    cliente: rafael,
    itens: [{ slug: "pre-treino-ignite-citrus-300g", qtd: 1 }],
    status: OrderStatus.DELIVERED,
    metodo: PaymentMethod.PIX,
    diasAtras: 12,
    frete: 15,
  });

  await criarPedido({
    cliente: joao,
    itens: [{ slug: "bcaa-amino-wave-tropical-200g", qtd: 2 }],
    status: OrderStatus.SHIPPED,
    metodo: PaymentMethod.PIX,
    diasAtras: 5,
    frete: 15,
  });

  await criarPedido({
    cliente: camila,
    itens: [
      { slug: "whey-protein-isolado-redberry-900g", qtd: 1 },
      { slug: "l-glutamina-recovery-300g", qtd: 1 },
    ],
    status: OrderStatus.PROCESSING,
    metodo: PaymentMethod.CREDIT_CARD,
    diasAtras: 3,
    frete: 0,
  });

  await criarPedido({
    cliente: rafael,
    itens: [{ slug: "omega-3-oceanpure-120-capsulas", qtd: 1 }],
    status: OrderStatus.PAID,
    metodo: PaymentMethod.PIX,
    diasAtras: 1,
    frete: 15,
  });

  await criarPedido({
    cliente: joao,
    itens: [{ slug: "colageno-hidrolisado-beauty-berry-300g", qtd: 1 }],
    status: OrderStatus.PENDING_PAYMENT,
    metodo: PaymentMethod.BOLETO,
    diasAtras: 0,
    frete: 15,
  });

  await criarPedido({
    cliente: camila,
    itens: [{ slug: "hipercalorico-massup-vanilla-1kg", qtd: 1 }],
    status: OrderStatus.CANCELLED,
    metodo: PaymentMethod.CREDIT_CARD,
    diasAtras: 7,
    frete: 15,
  });

  // ── ajustes de estoque ────────────────────────────────────
  // O estoque da lista é a carga inicial e as vendas acima já o reduziram, mas
  // nenhum produto chega ao limite mínimo. Estes dois ajustes criam os estados
  // de "estoque baixo" e "esgotado", para que apareçam no painel, no alerta da
  // página do produto e no selo de esgotado da vitrine.
  console.log("Aplicando ajustes de estoque...");

  async function ajustar(slug: string, novoSaldo: number, motivo: string) {
    const produto = porSlug(slug);
    // O saldo vem do banco: as vendas acima já consumiram parte da carga
    // inicial, e o valor em memória está desatualizado.
    const variante = await db.productVariant.findUniqueOrThrow({
      where: { id: produto.variants[0].id },
      select: { id: true, stock: true },
    });
    const diferenca = variante.stock - novoSaldo;
    if (diferenca <= 0) return;

    await db.productVariant.update({
      where: { id: variante.id },
      data: { stock: novoSaldo },
    });
    await db.stockMovement.create({
      data: {
        variantId: variante.id,
        type: StockMovementType.ADJUSTMENT,
        quantity: diferenca,
        stockAfter: novoSaldo,
        reason: motivo,
        createdById: admin.id,
        createdAt: daysAgo(2),
      },
    });
  }

  await ajustar("hipercalorico-massup-vanilla-1kg", 2, "Divergência na contagem de inventário");
  await ajustar("colageno-hidrolisado-beauty-berry-300g", 0, "Lote avariado no transporte");

  // ── avaliações (só de itens entregues) ────────────────────
  console.log("Criando avaliações...");

  const avaliacoes: Array<{
    pedido: typeof entregue1;
    slug: string;
    userId: string;
    rating: number;
    title: string;
    comment: string;
  }> = [
    {
      pedido: entregue1,
      slug: "whey-protein-concentrado-chocofuel-900g",
      userId: joao.id,
      rating: 5,
      title: "Melhor custo-benefício",
      comment:
        "Uso há 6 meses e os resultados são visíveis. Dissolve bem, sabor de chocolate não enjoa. Recomendo.",
    },
    {
      pedido: entregue1,
      slug: "creatina-monohidratada-purecore-300g",
      userId: joao.id,
      rating: 5,
      title: "Pura e sem sabor residual",
      comment: "Dissolve fácil na água e não tem gosto. Ganho de força perceptível já na terceira semana.",
    },
    {
      pedido: entregue2,
      slug: "multivitaminico-daily-one-60-capsulas",
      userId: camila.id,
      rating: 4,
      title: "Bom, mas a cápsula é grande",
      comment: "Fórmula completa e senti diferença na disposição. Só acho a cápsula um pouco grande de engolir.",
    },
    {
      pedido: entregue2,
      slug: "creatina-monohidratada-purecore-300g",
      userId: camila.id,
      rating: 5,
      title: "Entrega rápida e produto lacrado",
      comment: "Chegou em dois dias, lacrado e bem embalado. Dissolve sem grumos e não tem gosto nenhum.",
    },
    {
      pedido: entregue3,
      slug: "pre-treino-ignite-citrus-300g",
      userId: rafael.id,
      rating: 5,
      title: "Foco do início ao fim",
      comment:
        "Energia e foco do começo ao fim do treino, sem aquele pico e queda. O sabor cítrico é bem leve.",
    },
  ];

  for (const a of avaliacoes) {
    const produto = porSlug(a.slug);
    const item = await db.orderItem.findFirst({
      where: { orderId: a.pedido.id, productSlug: a.slug },
    });
    await db.review.create({
      data: {
        productId: produto.id,
        userId: a.userId,
        orderItemId: item?.id ?? null,
        rating: a.rating,
        title: a.title,
        comment: a.comment,
        createdAt: daysAgo(Math.floor(Math.random() * 8) + 2),
      },
    });
  }

  // Recalcula os agregados denormalizados, como fará o service de avaliações.
  console.log("Recalculando médias de avaliação...");
  for (const produto of produtosCriados) {
    const agg = await db.review.aggregate({
      where: { productId: produto.id, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: produto.id },
      data: {
        ratingAverage: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        reviewCount: agg._count,
      },
    });
  }

  // ── newsletter ────────────────────────────────────────────
  await db.newsletterSubscriber.createMany({
    data: [
      { email: "joao@email.com" },
      { email: "camila@email.com" },
      { email: "lucas.mendonca@email.com" },
      { email: "beatriz.santos@email.com" },
      { email: "cancelado@email.com", isActive: false, unsubscribedAt: daysAgo(5) },
    ],
  });

  // ── resumo ────────────────────────────────────────────────
  const [nProd, nVar, nPed, nAval] = await Promise.all([
    db.product.count(),
    db.productVariant.count(),
    db.order.count(),
    db.review.count(),
  ]);

  console.log(`
Seed concluído.

  Categorias .......... ${CATEGORIES.length}
  Marcas .............. ${BRANDS.length}
  Produtos ............ ${nProd}
  Variantes (SKUs) .... ${nVar}
  Pedidos ............. ${nPed}
  Avaliações .......... ${nAval}
  Flash Sale ativa .... ${flashAtiva.name} (encerra em ${flashAtiva.endsAt.toLocaleString("pt-BR")})

  Acesso admin ........ admin@supz.com.br / supz1234
  Acesso cliente ...... joao@email.com / supz1234
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
