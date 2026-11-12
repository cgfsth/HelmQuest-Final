# Build from the repository root:
# docker build -f backend/Dockerfile -t helmquest-api .
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libreoffice-impress fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend/ ./
COPY --chown=node:node shared/ /app/shared/
ENV NODE_ENV=production LIBREOFFICE_PATH=/usr/bin/libreoffice
USER node
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
