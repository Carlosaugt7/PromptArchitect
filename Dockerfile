# ---------- Build stage ----------
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Install deps (cache-friendly)
COPY package.json bun.lock* ./
RUN bun install

# Copy source and build with Node preset (Easypanel runs Node, not Cloudflare Workers)
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

# ---------- Runtime stage ----------
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Nitro's node-server preset emits a self-contained bundle in .output/
COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
