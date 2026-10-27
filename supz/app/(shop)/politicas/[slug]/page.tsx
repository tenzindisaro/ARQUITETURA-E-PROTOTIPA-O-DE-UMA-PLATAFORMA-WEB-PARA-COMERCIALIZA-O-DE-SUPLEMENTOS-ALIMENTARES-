import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Conteúdo institucional fixo: não há necessidade de um CMS neste projeto.
const POLITICAS = {
  privacidade: {
    titulo: "Política de privacidade",
    resumo: "Como a SUPZ coleta, usa e protege seus dados pessoais.",
    secoes: [
      {
        titulo: "Quais dados coletamos",
        texto: "Coletamos os dados que você informa ao criar uma conta e finalizar uma compra: nome, e-mail, telefone, CPF e endereço de entrega. Registramos também o histórico dos seus pedidos e das suas avaliações.",
      },
      {
        titulo: "Para que usamos",
        texto: "Os dados servem para identificar você, processar e entregar seus pedidos, dar suporte e — se você autorizar no cadastro da newsletter — enviar ofertas.",
      },
      {
        titulo: "Como protegemos",
        texto: "Sua senha é armazenada apenas como hash criptográfico: nem a equipe da loja consegue lê-la. Dados de pagamento não trafegam nem são armazenados pela plataforma.",
      },
      {
        titulo: "Compartilhamento",
        texto: "Não vendemos seus dados. Eles são compartilhados apenas com transportadoras, para a entrega, e com o processador de pagamento, no que for necessário para concluir a transação.",
      },
      {
        titulo: "Seus direitos",
        texto: "Você pode acessar, corrigir ou solicitar a exclusão dos seus dados a qualquer momento pelo e-mail contato@supz.com.br, conforme a Lei Geral de Proteção de Dados.",
      },
    ],
  },
  "termos-de-uso": {
    titulo: "Termos de uso",
    resumo: "Condições para utilizar a loja online da SUPZ.",
    secoes: [
      {
        titulo: "Aceitação",
        texto: "Ao criar uma conta ou finalizar uma compra, você concorda com estes termos. Se não concordar, não utilize a plataforma.",
      },
      {
        titulo: "Cadastro",
        texto: "As informações do cadastro devem ser verdadeiras e atualizadas. A conta é pessoal e intransferível, e você responde pelo que for feito com ela.",
      },
      {
        titulo: "Preços e disponibilidade",
        texto: "Preços e estoque podem mudar sem aviso. O valor que vale é o exibido no momento em que o pedido é fechado. Promoções relâmpago encerram automaticamente no horário indicado.",
      },
      {
        titulo: "Pedidos",
        texto: "Reservamos o direito de recusar ou cancelar pedidos com indício de erro de preço, fraude ou indisponibilidade de estoque. Em caso de cancelamento, o valor é integralmente devolvido.",
      },
      {
        titulo: "Uso dos produtos",
        texto: "Suplementos alimentares não substituem uma alimentação equilibrada. Consulte um nutricionista ou médico antes de iniciar qualquer suplementação.",
      },
    ],
  },
  "trocas-e-devolucoes": {
    titulo: "Política de troca e devolução",
    resumo: "Prazos e condições para trocar ou devolver um produto.",
    secoes: [
      {
        titulo: "Arrependimento",
        texto: "Você tem até 7 dias corridos após o recebimento para desistir da compra, conforme o Código de Defesa do Consumidor. O produto deve estar lacrado e na embalagem original.",
      },
      {
        titulo: "Troca por defeito",
        texto: "Produtos com defeito de fabricação ou avaria no transporte podem ser trocados em até 30 dias do recebimento. Registre o ocorrido com fotos e entre em contato.",
      },
      {
        titulo: "Como solicitar",
        texto: "Acesse Minha conta → Meus pedidos, localize o pedido e entre em contato pelo WhatsApp ou e-mail informando o número do pedido. Nossa equipe organiza a coleta.",
      },
      {
        titulo: "Reembolso",
        texto: "Após a chegada e conferência do produto, o reembolso é processado em até 10 dias úteis, no mesmo meio de pagamento usado na compra.",
      },
      {
        titulo: "O que não é aceito",
        texto: "Produtos abertos, com lacre violado, fora da embalagem original ou com prazo de validade comprometido por armazenamento inadequado.",
      },
    ],
  },
} as const;

type Slug = keyof typeof POLITICAS;

export function generateStaticParams() {
  return Object.keys(POLITICAS).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/politicas/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const politica = POLITICAS[slug as Slug];
  if (!politica) return { title: "Página não encontrada" };
  return { title: politica.titulo, description: politica.resumo };
}

export default async function Page(props: PageProps<"/politicas/[slug]">) {
  const { slug } = await props.params;
  const politica = POLITICAS[slug as Slug];
  if (!politica) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10 border-b pb-8">
        <h1 className="text-4xl font-black tracking-tight">{politica.titulo}</h1>
        <p className="mt-2 text-muted-foreground">{politica.resumo}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Documento de demonstração, elaborado para um projeto acadêmico. Não
          constitui um instrumento jurídico válido.
        </p>
      </header>

      <div className="space-y-8">
        {politica.secoes.map((secao, i) => (
          <section key={secao.titulo}>
            <h2 className="text-lg font-bold">
              {i + 1}. {secao.titulo}
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{secao.texto}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
