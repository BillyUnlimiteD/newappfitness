#!/bin/sh
set -e

echo "⏳ Esperando que MySQL esté disponible..."

until nc -z -v -w5 "$DB_HOST" 3306 2>/dev/null; do
  echo "   MySQL no disponible todavía, reintentando en 3s..."
  sleep 3
done

echo "✅ MySQL disponible."

echo "🔄 Sincronizando esquema con la base de datos..."
npx prisma db push --accept-data-loss

if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Ejecutando seed..."
  node dist/prisma/seed.js
fi

echo "🚀 Iniciando servidor..."
exec node dist/src/app.js
