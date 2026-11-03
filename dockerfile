# Étape 1 : Build de l'application
ARG NODE_VERSION=24.16.0
FROM node:${NODE_VERSION}-slim AS build

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier le package.json et le package-lock.json
COPY package*.json ./

# Installer les dépendances (vite-plus est fourni par node_modules, pas besoin de l'installateur global)
RUN npm ci

# Copier le reste du code de l'application
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Construire l'application Nuxt
RUN npm run build

# Étape 2 : Exécution de l'application
FROM node:24-slim

# Installer openssl et ca-certificates requis pour Prisma et Supabase au runtime
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copier la build autonome générée par Nuxt (Nitro)
COPY --from=build /app/.output ./.output

# Copier les fichiers requis pour Prisma et les migrations
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules

# Exposer le port de l'application (Nuxt/Nitro écoute sur le port 3000 par défaut)
EXPOSE 3000

# Lancer les migrations puis démarrer le serveur Nuxt
CMD npx prisma migrate deploy && node .output/server/index.mjs