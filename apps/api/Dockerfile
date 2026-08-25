FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm --filter @opass/db prisma:generate && pnpm --filter @opass/shared build && pnpm --filter @opass/db build && pnpm --filter @opass/api build
EXPOSE 4000
CMD ["pnpm","--filter","@opass/api","start"]
