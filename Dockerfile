# Multi-stage Dockerfile for ShamBit Platform
# Optimized for production deployment

# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY services/ ./services/

# Install dependencies
RUN npm ci --only=production=false

# Build all packages
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --chown=nodejs:nodejs --from=builder /app/packages/config/dist ./packages/config/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/config/package.json ./packages/config/
COPY --chown=nodejs:nodejs --from=builder /app/packages/database/dist ./packages/database/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/database/package.json ./packages/database/
COPY --chown=nodejs:nodejs --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --chown=nodejs:nodejs --from=builder /app/services/api/dist ./services/api/dist
COPY --chown=nodejs:nodejs --from=builder /app/services/api/package.json ./services/api/

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "services/api/dist/index.js"]
