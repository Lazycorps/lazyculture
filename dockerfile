ARG NODE_VERSION=20.14.0

# Create build stage
FROM node:${NODE_VERSION}-slim AS build

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


# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le package.json et le package-lock.json pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Construire l'application Nuxt.js pour la production
RUN npm run build

# Étape 2 : Exécuter l'application
FROM node:18

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier uniquement les fichiers nécessaires du build précédent
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules

# Exposer le port sur lequel l'application s'exécutera
EXPOSE 3000

# Lancer l'application Nuxt.js
CMD ["node", ".output/server/index.mjs"]