# Use Node.js 22 (LTS) — required for native WebSocket support (@supabase/supabase-js realtime)
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Compile TypeScript ahead of time — running compiled JS avoids ts-node's
# runtime type-checking, which was exhausting the machine's heap at boot.
RUN npm run build

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["npm", "start"]
