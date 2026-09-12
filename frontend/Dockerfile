# ---- Frontend Dockerfile (multi-stage) ----

# Stage 1: Build the Vite/React app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build args so Vite can bake in the env at build time
ARG VITE_BACKEND_URL=http://localhost:5001
ARG VITE_FRONTEND_URL=http://localhost:5173
ARG VITE_GOOGLE_OAUTH_ENABLED=true
ARG VITE_GOOGLE_CLIENT_ID=

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_GOOGLE_OAUTH_ENABLED=$VITE_GOOGLE_OAUTH_ENABLED
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Custom nginx config for SPA routing
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
