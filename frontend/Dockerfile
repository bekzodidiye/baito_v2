# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
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
