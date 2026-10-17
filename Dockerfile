FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PAYGUARD_MODE=mock
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY data ./data
COPY public ./public
COPY scripts ./scripts
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:${PORT:-3000}/api/health || exit 1
CMD ["node", "server.js"]
