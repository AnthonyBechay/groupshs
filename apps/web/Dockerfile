FROM node:20-alpine

RUN apk add --no-cache libc6-compat bash

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Copy Prisma schema before install so postinstall can find it if needed
COPY apps/web/prisma ./apps/web/prisma
COPY apps/web/prisma.config.ts ./apps/web/prisma.config.ts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Generate Prisma client
RUN cd apps/web && npx prisma generate

# Build the web app
RUN pnpm --filter web build

# Copy public and static assets to where standalone server expects them
RUN cp -r apps/web/public apps/web/.next/standalone/apps/web/public
RUN cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Default command - overridden by docker-compose
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]
