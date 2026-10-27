# Etapa 1: construcción de la aplicación Angular
FROM node:20-alpine AS construccion
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: servidor web liviano con solo los archivos compilados
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/dist/appointech-frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost/ || exit 1
