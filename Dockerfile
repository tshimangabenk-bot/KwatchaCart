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

# Copy the whole built workspace from the builder (same glibc base). npm
# workspaces hoist deps to the root node_modules, so we copy everything to
# guarantee the native better-sqlite3 binary and all prod deps are present
# without a rebuild, regardless of how packages were hoisted.
COPY --from=builder /app ./

# Persist the SQLite database on a mounted volume.
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
