# Imagem única da aplicação. Sem multi-stage de propósito: o container também
# roda migrations e seed na subida, e para isso precisa do Prisma CLI e do tsx
# em tempo de execução.
FROM node:22-alpine

WORKDIR /app

# O Prisma 7 usa driver adapter (`pg`), não engines nativos — por isso não é
# preciso instalar openssl nem libc6-compat aqui.

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./

# `npm ci` dispara o postinstall, que gera o Prisma Client. A URL abaixo é só
# um valor de preenchimento: gerar o client não abre conexão com o banco.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Prepara o banco e sobe a aplicação.
CMD ["sh", "-c", "npx tsx scripts/setup.ts && npm run start"]
