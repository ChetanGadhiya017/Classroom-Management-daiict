# ---- build the React app
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- API that also serves the built app
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY --from=web /web/dist /app/frontend/dist
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8000/api/health || exit 1
CMD ["node", "src/server.js"]
