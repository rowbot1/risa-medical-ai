FROM node:20-alpine

# Install build dependencies for sqlite3
RUN apk add --no-cache python3 py3-setuptools make g++ sqlite-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (excluding sqlite3)
RUN npm ci --only=production --omit=optional

# Copy application files
COPY . .

# Rebuild sqlite3 after copying to ensure proper architecture
RUN cd /app && npm rebuild sqlite3 --build-from-source

# Create directories
RUN mkdir -p logs data

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Run the application
CMD ["node", "src/index.js"]
