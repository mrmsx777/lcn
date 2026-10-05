FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files first to cache the install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/engine/package.json apps/engine/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# Disable strict builds for crypto packages and install
RUN pnpm config set strict-dep-builds false
RUN pnpm install

# Copy all the remaining files
COPY . .

# Expose Vite (Dashboard) and Engine (WebSockets)
EXPOSE 3000
EXPOSE 8080

# Start the bot just like we do locally
CMD ["pnpm", "run", "dev"]
