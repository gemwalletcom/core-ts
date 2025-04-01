FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app

# Copy all package.json files first
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY packages/types/package.json packages/types/
COPY packages/swapper/package.json packages/swapper/
COPY apps/api/package.json apps/api/

# Install all dependencies
RUN pnpm install

FROM base AS builder
WORKDIR /app

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/swapper/node_modules ./packages/swapper/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Build packages in correct order with explicit path to node_modules
RUN pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE ${PORT}

# Copy only the necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/swapper/dist ./packages/swapper/dist
COPY --from=builder /app/packages/swapper/package.json ./packages/swapper/package.json

# Install production dependencies only
RUN pnpm install --prod

CMD ["node", "apps/api/dist/index.js"]
