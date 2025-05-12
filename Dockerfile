# Use Node.js 23 Alpine as the base image (upgraded from Node.js 20)
FROM node:24-alpine AS build

# Set working directory
WORKDIR /app

# Define build argument for version
ARG VERSION=0.1.1
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

# Add container metadata using labels
LABEL org.opencontainers.image.source="https://github.com/kjanat/ChatLogger"
LABEL org.opencontainers.image.description="API for storing and retrieving chat interactions"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${VCS_REF}"
LABEL org.opencontainers.image.authors="Kaj Kowalski <dev@kajkowalski.nl>"
LABEL org.opencontainers.image.url="https://github.com/kjanat/ChatLogger"
LABEL org.opencontainers.image.documentation="https://github.com/kjanat/ChatLogger#readme"

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Switch to production image for smaller footprint
FROM node:24-alpine AS production

# Set working directory
WORKDIR /app

# Copy built node modules and package files from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copy application source code selectively (exclude sensitive files)
COPY .dockerignore ./
COPY src ./src
COPY LICENSE README.md ./

# Create and set proper permissions on logs directory
RUN mkdir -p /app/logs && \
    chown -R 1001:1001 /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Install curl for healthcheck
RUN apk --no-cache add curl

# Switch to non-root user for security
USER 1001

# Define health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Command to run the application
CMD ["node", "src/server.js"]
