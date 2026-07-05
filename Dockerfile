# ---------- Build stage: install everything and build server + web ----------
FROM node:22-bookworm AS builder
WORKDIR /app

# Install workspace manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci

# Build both workspaces.
COPY . .
RUN npm run build

# ---------- Runtime stage: minimal image with prod artifacts ----------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    SERVE_WEB=true \
    DATABASE_PATH=/data/kwatchacart.sqlite

# Reuse the already-built node_modules (same glibc base) so the native
# better-sqlite3 binary and all prod deps are present without a rebuild.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/web/dist ./web/dist

# Persist the SQLite database on a mounted volume.
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
