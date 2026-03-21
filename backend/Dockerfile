# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# npm install genera el package-lock.json si no existe
RUN npm install

# Generar Prisma Client antes de compilar
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
# Copiar el lock generado en builder para que npm ci funcione
COPY --from=builder /app/package-lock.json ./

RUN npm ci --omit=dev

# Copiar artefactos del build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

RUN mkdir -p uploads

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
