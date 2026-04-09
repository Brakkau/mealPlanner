FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json ./
COPY yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma

RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma generate needs DATABASE_URL defined even for generation in some setups.
ENV DATABASE_URL="postgresql://docker:docker@127.0.0.1:5432/docker"
RUN npx prisma generate

# Optional Docker-only TypeScript relaxation via NEXT_DOCKER_IGNORE_TS_ERRORS=true
ARG NEXT_DOCKER_IGNORE_TS_ERRORS=false
ENV NEXT_DOCKER_IGNORE_TS_ERRORS=${NEXT_DOCKER_IGNORE_TS_ERRORS}
RUN npm run build

FROM node:20-alpine AS runner-deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma

# Install only production dependencies, then generate Prisma client.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Prisma generate doesn't need a live database connection, but DATABASE_URL must exist.
ENV DATABASE_URL="postgresql://docker:docker@127.0.0.1:5432/docker"
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl && addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=runner-deps /app/node_modules ./node_modules
COPY --from=runner-deps /app/prisma ./prisma

RUN chmod +x ./scripts/docker-entrypoint.sh && chown -R nextjs:nextjs /app

USER nextjs
EXPOSE 3002

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
