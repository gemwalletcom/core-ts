# Stage 1: Build the application
FROM node:22-slim AS builder

# Install pnpm
RUN npm install -g pnpm

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manager files and workspace package.json files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/swapper/package.json ./packages/swapper/

RUN pnpm install

# Copy the rest of the source code
COPY . .

# Build the application
RUN pnpm run build

# Deploy the target app ('api') to /prod_build
RUN pnpm --filter ./apps/api deploy --prod /prod_build

# Stage 2: Production environment
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE ${PORT}

# Install pnpm
RUN npm install -g pnpm

# Copy the deployed application from the builder stage
COPY --from=builder /prod_build .

# Command to run the application (path relative to WORKDIR)
CMD ["node", "dist/index.js"]
