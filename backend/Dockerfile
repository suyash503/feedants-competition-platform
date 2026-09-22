# Production image for the API.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first so they're cached between code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# Run as the unprivileged "node" user; uploads must be writable by it.
RUN mkdir -p uploads && chown node:node uploads
USER node

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "src/server.js"]
