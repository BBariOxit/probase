FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Development
FROM base AS development
ENV NODE_ENV=development \
    PORT=3002 \
    HOSTNAME="0.0.0.0" \
    WATCHPACK_POLLING=true

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3002
CMD ["npm", "run", "dev"]

# Build
FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3002 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3002
CMD ["node", "server.js"]
