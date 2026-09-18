# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# frontend/package-lock.json is gone: `workspaces: ["frontend"]` in the root
# package.json means npm keeps one lockfile at the root, and that file was
# never the one npm read. COPY would fail on the missing path, so it is
# dropped here too.
#
# This build has no lockfile to pin against - it resolves straight from
# package.json, as `npm install` already did even when the file was present.
# Making the image reproducible means giving this stage the root lock, which
# needs the compose build context widened past frontend/ first.
COPY package.json ./
RUN npm install

COPY . .

# The version shown in the drawer and the settings screen. The root
# package.json holds it, and it is outside this build context, so compose
# passes it in; vite.config.ts falls back to reading the file when building
# from a repo checkout.
ARG APP_VERSION=""
ENV APP_VERSION=$APP_VERSION

# Build the production frontend bundle
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
