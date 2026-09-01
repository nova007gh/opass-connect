FROM node:22-alpine
RUN corepack enable
WORKDIR /app
# Single COPY + single RUN to minimize cache layers
COPY . .
RUN pnpm install --no-frozen-lockfile && \
    pnpm --filter @opass/db prisma:generate && \
    pnpm --filter @opass/shared build && \
    pnpm --filter @opass/db build && \
    pnpm --filter @opass/api build
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @opass/api prisma:migrate && pnpm --filter @opass/api start"]
