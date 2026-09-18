# =============================================================================
# TrustForge Enterprise Backend Dockerfile
# Open-Source Container Specification (Compatible with Finch CLI & Docker)
# Hackathon Track: "Containers: Finch, EKS (Build it)" & "Containers: App Runner, ECS, EKS (Ship it)"
# =============================================================================

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build
COPY src ./src/
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy runtime assets and built code
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts || npm install --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Cedar policies
COPY cedar ./cedar

EXPOSE 5000

CMD ["node", "dist/server.js"]
