FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Development
FROM base AS development
ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true

COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# Build
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate
RUN npm run build

# Production
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm install --no-save prisma@7.9.1 && npm cache clean --force
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

USER node
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
