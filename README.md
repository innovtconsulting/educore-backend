# EduCore - Système de Gestion Académique

EduCore est une application de gestion académique moderne conçue pour les établissements d'enseignement, particulièrement adaptée aux cursus universitaires. Elle permet de gérer les établissements, les niveaux, les classes et les matières avec une flexibilité maximale.

## 🚀 Fonctionnalités principales

- **Gestion des Établissements :** CRUD complet pour les structures éducatives.
- **Gestion des Niveaux :** Définition des paliers académiques (ex: L1, L2, Master 1, etc.).
- **Gestion des Classes :** Support des classes multi-niveaux et multi-établissements (idéal pour les cursus universitaires partagés).
- **Gestion des Matières :** Attribution de codes uniques, noms et coefficients, reliées aux classes et niveaux correspondants.

## 🛠️ Stack Technique

- **Framework :** [NestJS](https://nestjs.com/) (TypeScript)
- **Base de données :** PostgreSQL
- **ORM :** TypeORM
- **Documentation :** Swagger / OpenAPI
- **Validation :** Class-validator

## 📋 Prérequis

- Node.js (v18+)
- npm ou yarn
- Instance PostgreSQL

## ⚙️ Installation

1. Clonez le dépôt :
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Configurez les variables d'environnement dans un fichier `.env` :
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=educore_db
   PORT=3000
   ```

## 🏃 Lancement

```bash
# Mode développement
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

## 📚 Documentation API

Une fois le serveur lancé, la documentation interactive Swagger est accessible à l'adresse suivante :
[http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## 🏗️ Architecture

Pour plus de détails sur les relations entre les entités et les choix techniques, veuillez consulter le fichier [GEMINI.md](./GEMINI.md).

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e
```

---
© 2026 EduCore - Tous droits réservés.
