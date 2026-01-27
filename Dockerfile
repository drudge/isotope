# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (ensure API calls go through the proxy)
ENV VITE_API_URL=/api
RUN npm run build && \
    echo "Build completed. Contents of dist:" && \
    ls -la dist/ && \
    echo "index.html content:" && \
    head -5 dist/index.html

# Production stage
FROM nginx:alpine

# Copy nginx template (not to templates dir - we handle substitution ourselves)
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Copy custom entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Default API URL (override with -e TECHNITIUM_API_URL=http://your-server:5380)
ENV TECHNITIUM_API_URL=http://localhost:5380

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
