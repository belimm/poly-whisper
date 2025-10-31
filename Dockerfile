# Use Node.js 20 LTS Alpine image for smaller size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for better security and functionality
RUN apk add --no-cache \
    dumb-init \
    su-exec \
    && addgroup -g 1001 -S nodejs \
    && adduser -S polysense -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R polysense:nodejs logs

# Remove development files
RUN rm -rf test/ *.md .env.example

# Set proper ownership
RUN chown -R polysense:nodejs /app

# Switch to non-root user
USER polysense

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]