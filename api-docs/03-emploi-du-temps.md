# API Emploi du Temps

**Base URL**: `/emploi-du-temps`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Créer un créneau
- **Méthode**: `POST`
- **URL**: `/emploi-du-temps`
- **Permissions requises**: `SCHEDULE_MANAGE`

#### Requête
```json
{
  "startTime": "2026-06-10T08:00:00Z",
  "endTime": "2026-06-10T10:00:00Z",
  "matiereId": 1,
  "enseignantId": 1,
  "etablissementId": 1,
  "classeId": 1,
  "niveauId": 1,
  "salleId": 1
}
```

#### Réponse (201)
```json
{
  "id": 1,
  "startTime": "2026-06-10T08:00:00Z",
  "endTime": "2026-06-10T10:00:00Z",
  "matiere": { "id": 1, "name": "Algorithmique" },
  "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
  "etablissement": { "id": 1, "name": "École ESPM" },
  "classe": { "id": 1, "name": "Classe A" },
  "niveau": { "id": 1, "name": "L1" },
  "salle": { "id": 1, "name": "Salle 101" }
}
```

---

### 2. Lister les créneaux
- **Méthode**: `GET`
- **URL**: `/emploi-du-temps`
- **Rôles autorisés**: `ETUDIANT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)
  - `classeId` (optionnel): Filtrer par classe
  - `niveauId` (optionnel): Filtrer par niveau
  - `enseignantId` (optionnel): Filtrer par enseignant
  - `start` (optionnel): Date de début (ISO)
  - `end` (optionnel): Date de fin (ISO)

#### Réponse (200)
```json
{
  "items": [
    {
      "id": 1,
      "startTime": "2026-06-10T08:00:00Z",
      "endTime": "2026-06-10T10:00:00Z",
      "matiere": { "id": 1, "name": "Algorithmique" },
      "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
      "etablissement": { "id": 1, "name": "École ESPM" },
      "classe": { "id": 1, "name": "Classe A" },
      "niveau": { "id": 1, "name": "L1" },
      "salle": { "id": 1, "name": "Salle 101" }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 15
}
```

---

### 3. Récupérer un créneau par ID
- **Méthode**: `GET`
- **URL**: `/emploi-du-temps/:id`
- **Rôles autorisés**: `ETUDIANT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`
- **Paramètres d'URL**:
  - `id`: ID du créneau

#### Réponse (200)
```json
{
  "id": 1,
  "startTime": "2026-06-10T08:00:00Z",
  "endTime": "2026-06-10T10:00:00Z",
  "matiere": { "id": 1, "name": "Algorithmique" },
  "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
  "etablissement": { "id": 1, "name": "École ESPM" },
  "classe": { "id": 1, "name": "Classe A" },
  "niveau": { "id": 1, "name": "L1" },
  "salle": { "id": 1, "name": "Salle 101" }
}
```

---

### 4. Modifier un créneau
- **Méthode**: `PATCH`
- **URL**: `/emploi-du-temps/:id`
- **Permissions requises**: `SCHEDULE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du créneau

#### Requête
```json
{
  "startTime": "2026-06-10T09:00:00Z",
  "endTime": "2026-06-10T11:00:00Z",
  "salleId": 2
}
```

#### Réponse (200)
```json
{
  "id": 1,
  "startTime": "2026-06-10T09:00:00Z",
  "endTime": "2026-06-10T11:00:00Z",
  "matiere": { "id": 1, "name": "Algorithmique" },
  "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
  "etablissement": { "id": 1, "name": "École ESPM" },
  "classe": { "id": 1, "name": "Classe A" },
  "niveau": { "id": 1, "name": "L1" },
  "salle": { "id": 2, "name": "Salle 102" }
}
```

---

### 5. Supprimer un créneau
- **Méthode**: `DELETE`
- **URL**: `/emploi-du-temps/:id`
- **Permissions requises**: `SCHEDULE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du créneau

#### Réponse (200)
Pas de contenu (204 No Content)
