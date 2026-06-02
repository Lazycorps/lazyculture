ARG NODE_VERSION=26.3.0

# Create build stage
FROM node:${NODE_VERSION}-slim AS build

# Installer curl et bash (requis pour récupérer le script d'installation de Vite+)
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*

# Installer la CLI Vite+ (vp) globalement dans le conteneur
RUN curl -fsSL https://vite.plus | bash

# Ajouter le binaire vp au PATH pour que Docker le trouve
ENV PATH="/root/.local/share/vite-plus/bin:$PATH"

ARG BASE_URL
ENV BASE_URL=$BASE_URL
ARG DIRECT_URL
ENV DIRECT_URL=$DIRECT_URL
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ARG SHADOW_DATABASE_URL
ENV SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL
ARG NUXT_API_KEY
ENV NUXT_API_KEY=$NUXT_API_KEY
ARG SUPABASE_URL
ENV SUPABASE_URL=$SUPABASE_URL
ARG SUPABASE_KEY
ENV SUPABASE_KEY=$SUPABASE_KEY

# Définir le répertoire de travail
WORKDIR /app

# Copier le package.json et le package-lock.json
COPY package*.json ./

# Installer les dépendances via Vite+
RUN vp install

# Copier le reste des fichiers
COPY . .

# Construire l'application Nuxt.js
RUN vp run build

# Étape 2 : Exécuter l'application (Pas besoin de vp ici, le build final est autonome)
FROM node:26-slim

WORKDIR /app

# Copier uniquement la sortie autonome générée par Nuxt (Nitro)
COPY --from=build /app/.output ./.output

# Exposer le port
EXPOSE 3000

# Lancer l'application
CMD ["node", ".output/server/index.mjs"]