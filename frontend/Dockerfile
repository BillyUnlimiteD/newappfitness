# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# npm install genera el package-lock.json si no existe
RUN npm install

COPY . .

# La URL del backend en producción la recibe como build arg
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Nginx serving ────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Configuración de Nginx para SPA React (redirige todo a index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
