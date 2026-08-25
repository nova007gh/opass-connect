FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm --filter @opass/shared build && pnpm --filter @opass/web build
EXPOSE 3000
CMD ["pnpm","--filter","@opass/web","start"]
