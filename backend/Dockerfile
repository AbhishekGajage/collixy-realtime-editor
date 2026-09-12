# ---- Backend Dockerfile ----
FROM node:20-alpine AS base

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5001

CMD ["node", "src/server.js"]
