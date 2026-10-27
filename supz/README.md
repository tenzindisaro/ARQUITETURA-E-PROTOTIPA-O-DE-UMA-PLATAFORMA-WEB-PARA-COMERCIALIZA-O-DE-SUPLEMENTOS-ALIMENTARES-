# SUPZ — E-commerce de Suplementos

Loja virtual de suplementos alimentares com área do cliente e painel
administrativo. Projeto acadêmico: roda inteiramente na máquina, sem depender de
nenhum serviço externo.

## Como rodar

Só é preciso ter **Docker** instalado.

```bash
docker compose up --build
```

Acesse **http://localhost:3000**.

Na primeira execução o container cria o banco, aplica as migrations e popula os
dados de demonstração automaticamente. Isso leva alguns minutos. Nas execuções
seguintes o seed é ignorado, então nada que você criar durante o uso é perdido.

Para parar: `Ctrl+C`, ou `docker compose down`.
Para recomeçar do zero: `docker compose down -v`.

> A construção da imagem precisa de pelo menos **4 GB** de memória disponível
> para o Docker. Em Docker Desktop, ajuste em Settings → Resources.

## Acessos

Senha de todas as contas: **`supz1234`**

| Perfil | E-mail |
|---|---|
| Administrador | `admin@supz.com.br` |
| Cliente | `joao@email.com` |
| Cliente | `camila@email.com` |
| Cliente | `rafael@email.com` |

## O que dá para testar

**Loja**

- Buscar e filtrar produtos por categoria, marca, preço e avaliação
- Ver os estados de estoque: o Colágeno Beauty Berry está esgotado e o
  Hipercalórico MassUp mostra o alerta de últimas unidades
- Montar o carrinho **sem estar logado**: ao entrar, ele é mesclado à sua conta
- Aplicar cupons: `SUPZ10` (10%), `FRETEGRATIS` (R$ 15 acima de R$ 150),
  `BLACKWEEK` (expirado) e `INATIVO5` (desativado)
- Finalizar a compra e escolher se o pagamento é aprovado ou recusado
- Acompanhar o pedido pela linha do tempo em Minha conta
- Avaliar produtos — só aparece para quem comprou e recebeu. Entre como
  `joao@email.com` e abra a Creatina PureCore ou o Whey ChocoFuel

**Painel administrativo** (`/admin`, só para o perfil de administrador)

- Dashboard com faturamento, pedidos pendentes, estoque baixo e mais vendidos
- Cadastrar e editar produtos, com variantes e upload de imagens
- Gerenciar categorias, marcas e cupons
- Ajustar estoque — cada ajuste vira uma movimentação registrada
- Mudar o status dos pedidos e cancelar (o cancelamento devolve o estoque)
- Ativar e desativar usuários, promover a administrador
- Relatórios de vendas, categorias, estoque e clientes

Vale olhar a **Flash Sale** na home: a Creatina PureCore custa R$ 89,90 de
tabela, tem preço promocional de R$ 74,90, mas sai por R$ 64,90 — a promoção
relâmpago tem precedência, e ela se encerra sozinha no horário marcado.

O catálogo tem 10 produtos de marcas fictícias, criados para esta demonstração.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Zustand · React Hook Form · Zod · Prisma 7 · PostgreSQL 17 · Auth.js

## Decisões do projeto

Por ser um projeto de demonstração, três pontos foram resolvidos localmente em
vez de com serviços externos:

- **Pagamento é simulado.** Na tela de pagamento você escolhe se a transação é
  aprovada ou recusada, para ver os dois caminhos. O modelo de dados é agnóstico
  de provedor — trocar por Mercado Pago é escrever um adapter, sem mexer no
  banco.
- **Imagens ficam em disco.** As fotos de demonstração estão em `public/seed/` e
  os uploads do administrador vão para `public/uploads/`; o banco guarda apenas
  o caminho.
- **Recuperação de senha mostra o link na tela.** O token é real — 32 bytes
  aleatórios, hash no banco, válido por 30 minutos e de uso único — mas não há
  serviço de e-mail, então o link aparece na própria página, com aviso.

## Desenvolvimento

Para trabalhar no código com recarregamento automático:

```bash
docker compose up -d db     # só o banco
npm install
cp .env.example .env        # gere o AUTH_SECRET com: openssl rand -base64 32
npm run db:migrate
npm run db:seed
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run verify` | Suítes de verificação das regras de negócio |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:seed` | Popula o banco |
| `npm run db:studio` | Prisma Studio |

### Verificação

`npm run verify` roda seis suítes contra o banco real, cobrindo as regras de
negócio: validação de CPF, ciclo do token de recuperação de senha, precificação
(promoção relâmpago vence preço promocional), merge do carrinho de visitante,
validação de cupom, transação do checkout com baixa de estoque, cancelamento com
devolução de estoque e cupom, proteções do painel e validade da sessão.

## Estrutura

```
app/(shop)      loja        app/(auth)  login e cadastro
app/(account)   minha conta app/admin   painel administrativo
lib/services    regra de negócio (transações, validações)
lib/validations schemas Zod compartilhados entre formulário e servidor
prisma          schema, migrations e seed
scripts         setup do container e suítes de verificação
```

Não há API REST: os Server Components consultam os serviços diretamente e as
mutações são Server Actions. O único Route Handler é o do Auth.js.

A autorização tem duas camadas: `proxy.ts` faz um redirect otimista pelo cookie,
e `lib/session.ts` é a verificação que decide — conferindo a conta **no banco**,
de modo que desativar um usuário tem efeito imediato.

O modelo de dados tem 20 entidades. A decisão central é que **toda variante é a
unidade de estoque**: mesmo um produto sem sabor tem uma variante, o que elimina
o caminho duplo entre produto e variante em carrinho, checkout e estoque. Pedidos
guardam cópia do nome, preço e endereço, então mudanças no catálogo não reescrevem
o histórico.
