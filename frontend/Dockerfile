# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional: Add custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
