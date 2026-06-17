FROM node:20-bookworm-slim AS deps
WORKDIR /app
# Toolchain & openssl for native deps (e.g., bcrypt) during npm ci
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npm run build

# Runtime image
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Install only production deps
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/docs ./docs

# Default: start API. Override CMD to run workers.
EXPOSE 3001
CMD ["node","dist/main.js"]
