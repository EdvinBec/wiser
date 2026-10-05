# =========================
# Build
# =========================
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines import.meta.env.VITE_* at BUILD time, so this has to be a build argument.
# Passing it as a runtime environment variable does nothing to a static bundle — the value is
# already baked in by then.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# =========================
# Runtime
# =========================
# Static files behind nginx. The previous image ran `vite dev`, which is a development server:
# no minification, hot-reload machinery, and a websocket it expects to keep open.
FROM nginx:alpine AS final

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
