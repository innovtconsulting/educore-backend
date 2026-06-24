# API Notes

**Base URL**: `/note`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Enregistrer une note
- **Méthode**: `POST`
- **URL**: `/note`
- **Permissions requises**: `ACADEMIC_MANAGE`

#### Requête
```json
{
  "value": 15.5,
  "remark": "Bon travail",
  "etudiantId": 1,
  "evaluationId": 1
}
```

#### Réponse (201)
```json
{
  "id": 1,
  "value": 15.5,
  "remark": "Bon travail",
  "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
  "evaluation": {
    "id": 1,
    "title": "DS1 Algorithmique",
    "matiere": { "id": 1, "name": "Algorithmique" },
    "semestre": { "id": 1, "name": "Semestre 1" }
  },
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 2. Enregistrer des notes en masse
- **Méthode**: `POST`
- **URL**: `/note/bulk`
- **Permissions requises**: `ACADEMIC_MANAGE`

#### Requête
```json
{
  "evaluationId": 1,
  "items": [
    {
      "etudiantId": 1,
      "value": 15.5,
      "remark": "Bon travail"
    },
    {
      "etudiantId": 2,
      "value": 12.0,
      "remark": "Peut mieux faire"
    }
  ]
}
```

#### Réponse (201)
```json
[
  {
    "id": 1,
    "value": 15.5,
    "remark": "Bon travail",
    "etudiant": { "id": 1 },
    "evaluation": { "id": 1 },
    "createdAt": "2026-06-08T10:00:00Z",
    "updatedAt": "2026-06-08T10:00:00Z"
  },
  {
    "id": 2,
    "value": 12.0,
    "remark": "Peut mieux faire",
    "etudiant": { "id": 2 },
    "evaluation": { "id": 1 },
    "createdAt": "2026-06-08T10:00:00Z",
    "updatedAt": "2026-06-08T10:00:00Z"
  }
]
```

---

### 3. Lister les notes d'un étudiant
- **Méthode**: `GET`
- **URL**: `/note/etudiant/:etudiantId`
- **Rôles autorisés**: `PARENT`, `ETUDIANT`
- **Paramètres d'URL**:
  - `etudiantId`: ID de l'étudiant
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)

#### Réponse (200)
```json
{
  "message": "Liste des notes récupérée avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "value": 15.5,
        "remark": "Bon travail",
        "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
        "evaluation": {
          "id": 1,
          "title": "DS1 Algorithmique",
          "matiere": { "id": 1, "name": "Algorithmique" },
          "semestre": { "id": 1, "name": "Semestre 1" }
        },
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

### 4. Lister les notes
- **Méthode**: `GET`
- **URL**: `/note`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`
- **Permissions requises**: `ACADEMIC_VIEW`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)
  - `etudiantId` (optionnel): Filtrer par étudiant

#### Réponse (200)
```json
{
  "message": "Liste des notes récupérée avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "value": 15.5,
        "remark": "Bon travail",
        "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
        "evaluation": {
          "id": 1,
          "title": "DS1 Algorithmique",
          "matiere": { "id": 1, "name": "Algorithmique" },
          "semestre": { "id": 1, "name": "Semestre 1" }
        },
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

### 5. Récupérer une note par ID
- **Méthode**: `GET`
- **URL**: `/note/:id`
- **Rôle autorisé**: `ETUDIANT`
- **Permissions requises**: `ACADEMIC_VIEW`
- **Paramètres d'URL**:
  - `id`: ID de la note

#### Réponse (200)
```json
{
  "id": 1,
  "value": 15.5,
  "remark": "Bon travail",
  "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
  "evaluation": {
    "id": 1,
    "title": "DS1 Algorithmique",
    "matiere": { "id": 1, "name": "Algorithmique" },
    "semestre": { "id": 1, "name": "Semestre 1" }
  },
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 6. Modifier une note
- **Méthode**: `PATCH`
- **URL**: `/note/:id`
- **Permissions requises**: `ACADEMIC_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID de la note

#### Requête
```json
{
  "value": 16.0,
  "remark": "Excellent travail"
}
```

#### Réponse (200)
```json
{
  "id": 1,
  "value": 16.0,
  "remark": "Excellent travail",
  "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
  "evaluation": { "id": 1, "title": "DS1 Algorithmique" },
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-09T15:30:00Z"
}
```

---

### 7. Supprimer une note
- **Méthode**: `DELETE`
- **URL**: `/note/:id`
- **Permissions requises**: `ACADEMIC_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID de la note

#### Réponse (200)
```json
{
  "id": 1,
  "value": 15.5,
  "remark": "Bon travail"
}
```
