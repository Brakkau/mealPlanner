#!/bin/sh
set -eu

echo "Bootstrapping database..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

# Two DB modes:
# - container-db: apply schema changes (migrate deploy or db push)
# - host-db: do NOT apply destructive schema actions; only verify connectivity
DB_MODE="${DB_MODE:-container-db}"
echo "DB_MODE=${DB_MODE}"

if [ "${DB_MODE}" = "host-db" ]; then
  echo "Host DB mode: skipping prisma migrate/db push"
  echo "Verifying connectivity from the container..."
  node -e "const { PrismaClient } = require('@prisma/client'); (async () => { const prisma = new PrismaClient(); try { await prisma.\$queryRaw\`SELECT 1\`; console.log('Prisma connectivity OK'); } finally { await prisma.\$disconnect(); } })().catch(e => { console.error(e); process.exit(1); });"
else
  # If migrations exist, apply them. If not, fallback to schema push.
  if [ -d "prisma/migrations" ] && ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
    echo "Migrations found: running prisma migrate deploy"
    npx prisma migrate deploy
  else
    echo "No migrations found: running prisma db push --skip-generate"
    npx prisma db push --skip-generate
  fi
fi

echo "Starting Next.js..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3002}"
