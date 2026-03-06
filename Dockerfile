FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build || true
RUN test -d dist && test -f dist/index.js || (echo "Build failed: dist/index.js not found" && exit 1)

# Production
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nexusmind
RUN adduser --system --uid 1001 nexusmind

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/config ./config

RUN mkdir -p data/db data/vectors data/memory data/logs skills
RUN chown -R nexusmind:nexusmind /app

USER nexusmind

EXPOSE 3000 3001 3002

CMD ["node", "dist/index.js"]
