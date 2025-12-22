# Multi-stage build for Planning Poker application
# Stage 1: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY shared/ ../shared/
COPY backend/src ./src
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY shared/ ../shared/
COPY frontend/ ./
RUN npm run build

# Stage 3: Production dependencies for backend
FROM node:18-alpine AS backend-deps

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Stage 4: Production image with Nginx + Node.js
FROM nginx:alpine

# Install Node.js and npm in the nginx container
RUN apk add --no-cache nodejs npm curl

# Create app directory
RUN mkdir -p /app/backend

# Copy built backend
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-deps /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/package.json /app/backend/

# Copy built frontend to nginx html directory
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Create logs directory
RUN mkdir -p /var/log/planning-poker

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start both services
CMD ["/start.sh"]