# Stage 1: frontend builder -- produces the static Vite production build
# that the runtime stage serves via Express.
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend builder -- compiles TypeScript and generates the Prisma
# client. devDependencies (typescript, ts-node, vitest, etc.) live only in
# this stage's node_modules and are never copied into the runtime stage.
FROM node:22-alpine AS backend-builder
RUN apk add --no-cache openssl curl
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: runtime -- a single container serving both the compiled API and
# the built frontend on one port, satisfying Render's one-process/one-port
# Docker Web Service model. No Nginx: Express serves the SPA's static
# assets directly, so there is no reverse-proxy config to keep in sync
# with Render's dynamically assigned $PORT.
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=backend-builder --chown=node:node /app/dist ./dist
COPY --from=backend-builder --chown=node:node /app/prisma ./prisma
COPY --from=frontend-builder --chown=node:node /app/frontend/dist ./public
RUN npx prisma generate
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
