ARG NODE_VERSION=20.14.0

# Create build stage
FROM node:${NODE_VERSION}-slim AS build

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