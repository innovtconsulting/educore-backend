# API Documents

**Base URL**: `/documents`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Uploader un document
- **Méthode**: `POST`
- **URL**: `/documents/upload`
- **Rôles autorisés**: `ADMIN`, `ENSEIGNANT`, `SUPER_ADMIN`
- **Permissions requises**: `DOCUMENT_MANAGE`, `ACADEMIC_MANAGE`
- **Content-Type**: `multipart/form-data`

#### Champs form-data
| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| file | File | Oui | Fichier à uploader (max 10MB) |
| title | String | Oui | Titre du document |
| description | String | Non | Description du document |
| category | String | Non | Catégorie: `Administratif`, `Pédagogique`, `Règlement`, `Autre` |

#### Réponse (201)
```json
{
  "message": "Document uploadé avec succès",
  "data": {
    "id": 1,
    "title": "Règlement Intérieur 2026",
    "description": "Règlement intérieur pour l'année académique 2026",
    "category": "Règlement",
    "filePath": "uploads/documents/abc123.pdf",
    "originalName": "reglement-2026.pdf",
    "mimeType": "application/pdf",
    "fileSize": 245678,
    "etablissement": { "id": 1 },
    "createdAt": "2026-06-08T10:00:00Z",
    "updatedAt": "2026-06-08T10:00:00Z"
  }
}
```

---

### 2. Uploader un rendu de devoir (étudiant)
- **Méthode**: `POST`
- **URL**: `/documents/upload/rendu`
- **Rôle autorisé**: `ETUDIANT`
- **Content-Type**: `multipart/form-data`

#### Champs form-data
| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| file | File | Oui | Fichier à uploader (max 10MB) |
| title | String | Non | Titre du rendu |
| description | String | Non | Description du rendu |

#### Réponse (201)
```json
{
  "message": "Rendu uploadé avec succès",
  "data": {
    "id": 2,
    "title": "Rendu TP Algorithmique Paul Martin",
    "description": "Rendu de devoir",
    "category": "Pédagogique",
    "filePath": "uploads/documents/def456.pdf",
    "originalName": "tp-algo-paul.pdf",
    "mimeType": "application/pdf",
    "fileSize": 123456,
    "etablissement": { "id": 1 },
    "createdAt": "2026-06-10T14:00:00Z",
    "updatedAt": "2026-06-10T14:00:00Z"
  }
}
```

---

### 3. Lister les documents
- **Méthode**: `GET`
- **URL**: `/documents`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`, `COMPTABLE`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)
  - `search` (optionnel): Recherche par titre ou description

#### Réponse (200)
```json
{
  "message": "Liste des documents récupérée avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "Règlement Intérieur 2026",
        "description": "Règlement intérieur pour l'année académique 2026",
        "category": "Règlement",
        "filePath": "uploads/documents/abc123.pdf",
        "originalName": "reglement-2026.pdf",
        "mimeType": "application/pdf",
        "fileSize": 245678,
        "etablissement": { "id": 1 },
        "createdAt": "2026-06-08T10:00:00Z",
        "updatedAt": "2026-06-08T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 15
  }
}
```

---

### 4. Récupérer un document par ID
- **Méthode**: `GET`
- **URL**: `/documents/:id`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`, `COMPTABLE`
- **Paramètres d'URL**:
  - `id`: ID du document

#### Réponse (200)
```json
{
  "message": "Document #1 récupéré avec succès",
  "data": {
    "id": 1,
    "title": "Règlement Intérieur 2026",
    "description": "Règlement intérieur pour l'année académique 2026",
    "category": "Règlement",
    "filePath": "uploads/documents/abc123.pdf",
    "originalName": "reglement-2026.pdf",
    "mimeType": "application/pdf",
    "fileSize": 245678,
    "etablissement": { "id": 1 },
    "createdAt": "2026-06-08T10:00:00Z",
    "updatedAt": "2026-06-08T10:00:00Z"
  }
}
```

---

### 5. Modifier les métadonnées d'un document
- **Méthode**: `PATCH`
- **URL**: `/documents/:id`
- **Permissions requises**: `DOCUMENT_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du document

#### Requête
```json
{
  "title": "Règlement Intérieur 2026 - Modifié",
  "description": "Nouvelle description",
  "category": "Administratif"
}
```

#### Réponse (200)
```json
{
  "message": "Document #1 mis à jour avec succès",
  "data": {
    "id": 1,
    "title": "Règlement Intérieur 2026 - Modifié",
    "description": "Nouvelle description",
    "category": "Administratif",
    "filePath": "uploads/documents/abc123.pdf",
    "etablissement": { "id": 1 },
    "createdAt": "2026-06-08T10:00:00Z",
    "updatedAt": "2026-06-09T15:30:00Z"
  }
}
```

---

### 6. Supprimer un document
- **Méthode**: `DELETE`
- **URL**: `/documents/:id`
- **Permissions requises**: `DOCUMENT_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du document

#### Réponse (200)
```json
{
  "message": "Document #1 supprimé avec succès"
}
```
