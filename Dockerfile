# syntax=docker/dockerfile:1
# ---------------------------------
# 1. Base Stage
# ---------------------------------
FROM node:24.11.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true

RUN corepack enable && corepack prepare pnpm@latest --activate
# Ensure git exists in all stages
RUN apk add --no-cache git libc6-compat
WORKDIR /app

# ---------------------------------
# 2. JSON Files Stage (Cache optimization)
# ---------------------------------
FROM base AS json-files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/common/package.json ./packages/common/package.json
COPY packages/client/package.json ./packages/client/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json

# ---------------------------------
# 3. Dependencies Stage
# ---------------------------------
FROM base AS deps
COPY --from=json-files /app /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# ---------------------------------
# 4. Builder Stage
# ---------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Re-link workspace
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# Build all projects
RUN pnpm run packages:build && \
    pnpm run server:build && \
    pnpm run web:build

# ---------------------------------
# 5. Pruner Stage (Optimized)
# ---------------------------------
FROM base AS pruner
COPY --from=json-files /app /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --filter @tg-search/server --ignore-scripts --frozen-lockfile --no-optional && \
    find node_modules -type f -name "*.map" -delete && \
    find node_modules -type f -name "*.md" -delete && \
    find node_modules -type f -name "*.ts" -delete && \
    find node_modules -type d -name "test" -exec rm -rf {} + && \
    find node_modules -type d -name "tests" -exec rm -rf {} + && \
    find node_modules -type d -name "docs" -exec rm -rf {} + && \
    find node_modules -type f -name "*.d.ts" -delete

# ---------------------------------
# 6. Runtime Stage
# ---------------------------------
FROM node:24.11.0-alpine AS runner

WORKDIR /app

# Install nginx and set permissions
# Add libc6-compat to support native modules that might depend on glibc (e.g. @node-rs/jieba)
RUN apk add --no-cache nginx curl ca-certificates libc6-compat && \
    mkdir -p /usr/share/nginx/html && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/lib/nginx && \
    touch /var/run/nginx.pid && \
    chown -R node:node /var/log/nginx /var/lib/nginx /var/run/nginx.pid /usr/share/nginx/html /app

# Copy pruned clean dependencies
COPY --from=pruner --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/config/config.example.yaml ./config/config.example.yaml
COPY --from=builder --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=node:node /app/apps/web/dist /usr/share/nginx/html

COPY --chown=node:node nginx.conf /etc/nginx/nginx.conf

ENV DATABASE_TYPE="pglite" \
    DATABASE_URL="" \
    TELEGRAM_API_ID="611335" \
    TELEGRAM_API_HASH="d524b414d21f4d37f08684c1df41ac9c" \
    EMBEDDING_API_KEY="" \
    EMBEDDING_BASE_URL="https://api.openai.com/v1" \
    PROXY_URL=""

VOLUME ["/app/config", "/app/data"]
EXPOSE 3333

# Switch to non-root user
USER node

CMD ["sh", "-c", "nginx && exec node apps/server/dist/app.mjs"]
