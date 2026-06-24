# API Devoirs

**Base URL**: `/devoirs`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Créer un devoir
- **Méthode**: `POST`
- **URL**: `/devoirs`
- **Permissions requises**: `ACADEMIC_MANAGE`

#### Requête
```json
{
  "title": "TP Algorithmique",
  "description": "Implémenter une liste chaînée en C",
  "deadline": "2026-06-15T23:59:59Z",
  "matiereId": 1,
  "classeId": 1,
  "niveauId": 1,
  "documentIds": [1]
}
```

#### Réponse (201)
```json
{
  "id": 1,
  "title": "TP Algorithmique",
  "description": "Implémenter une liste chaînée en C",
  "deadline": "2026-06-15T23:59:59Z",
  "matiere": { "id": 1, "name": "Algorithmique" },
  "classe": { "id": 1, "name": "Classe A" },
  "niveau": { "id": 1, "name": "L1" },
  "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
  "documents": [
    {
      "id": 1,
      "title": "Sujet TP",
      "filePath": "uploads/documents/sujet.pdf"
    }
  ],
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 2. Lister les devoirs
- **Méthode**: `GET`
- **URL**: `/devoirs`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)

#### Réponse (200)
```json
{
  "items": [
    {
      "id": 1,
      "title": "TP Algorithmique",
      "description": "Implémenter une liste chaînée en C",
      "deadline": "2026-06-15T23:59:59Z",
      "matiere": { "id": 1, "name": "Algorithmique" },
      "classe": { "id": 1, "name": "Classe A" },
      "niveau": { "id": 1, "name": "L1" },
      "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
      "documents": [],
      "createdAt": "2026-06-08T10:00:00Z",
      "updatedAt": "2026-06-08T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 15
}
```

---

### 3. Lister les devoirs par classe et niveau
- **Méthode**: `GET`
- **URL**: `/devoirs/classe/:classeId/niveau/:niveauId`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`
- **Paramètres d'URL**:
  - `classeId`: ID de la classe
  - `niveauId`: ID du niveau

#### Réponse (200)
```json
[
  {
    "id": 1,
    "title": "TP Algorithmique",
    "description": "Implémenter une liste chaînée en C",
    "deadline": "2026-06-15T23:59:59Z",
    "matiere": { "id": 1, "name": "Algorithmique" },
    "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
    "documents": []
  }
]
```

---

### 4. Récupérer un devoir par ID
- **Méthode**: `GET`
- **URL**: `/devoirs/:id`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`
- **Paramètres d'URL**:
  - `id`: ID du devoir

#### Réponse (200)
```json
{
  "id": 1,
  "title": "TP Algorithmique",
  "description": "Implémenter une liste chaînée en C",
  "deadline": "2026-06-15T23:59:59Z",
  "matiere": { "id": 1, "name": "Algorithmique" },
  "classe": { "id": 1, "name": "Classe A", "etablissements": [{ "id": 1 }] },
  "niveau": { "id": 1, "name": "L1" },
  "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
  "documents": [
    {
      "id": 1,
      "title": "Sujet TP",
      "filePath": "uploads/documents/sujet.pdf"
    }
  ],
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 5. Modifier un devoir
- **Méthode**: `PATCH`
- **URL**: `/devoirs/:id`
- **Permissions requises**: `ACADEMIC_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du devoir

#### Requête
```json
{
  "title": "TP Algorithmique (Modifié)",
  "deadline": "2026-06-20T23:59:59Z"
}
```

#### Réponse (200)
```json
{
  "id": 1,
  "title": "TP Algorithmique (Modifié)",
  "description": "Implémenter une liste chaînée en C",
  "deadline": "2026-06-20T23:59:59Z",
  "matiere": { "id": 1, "name": "Algorithmique" },
  "classe": { "id": 1, "name": "Classe A" },
  "niveau": { "id": 1, "name": "L1" },
  "enseignant": { "id": 1, "firstName": "Jean", "lastName": "Dupont" },
  "documents": [],
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-09T15:30:00Z"
}
```

---

### 6. Supprimer un devoir
- **Méthode**: `DELETE`
- **URL**: `/devoirs/:id`
- **Permissions requises**: `ACADEMIC_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du devoir

#### Réponse (200)
```json
{
  "id": 1,
  "title": "TP Algorithmique",
  "description": "Implémenter une liste chaînée en C"
}
```

---

## Soumissions de devoirs

### 7. Soumettre un rendu
- **Méthode**: `POST`
- **URL**: `/devoirs/:id/soumissions`
- **Rôle autorisé**: `ETUDIANT`
- **Paramètres d'URL**:
  - `id`: ID du devoir

#### Requête
```json
{
  "documentId": 2,
  "comment": "Voici mon rendu pour le TP"
}
```

#### Réponse (201)
```json
{
  "message": "Rendu soumis avec succès",
  "data": {
    "id": 1,
    "comment": "Voici mon rendu pour le TP",
    "devoir": { "id": 1, "title": "TP Algorithmique" },
    "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
    "document": { "id": 2, "title": "Rendu Paul Martin" },
    "submittedAt": "2026-06-10T14:00:00Z",
    "updatedAt": "2026-06-10T14:00:00Z"
  }
}
```

---

### 8. Lister tous les rendus pour un devoir
- **Méthode**: `GET`
- **URL**: `/devoirs/:id/soumissions`
- **Permissions requises**: `ACADEMIC_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du devoir

#### Réponse (200)
```json
{
  "message": "Liste des rendus récupérée avec succès",
  "data": [
    {
      "id": 1,
      "comment": "Voici mon rendu pour le TP",
      "devoir": { "id": 1 },
      "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
      "document": { "id": 2, "title": "Rendu Paul Martin" },
      "submittedAt": "2026-06-10T14:00:00Z",
      "updatedAt": "2026-06-10T14:00:00Z"
    }
  ]
}
```

---

### 9. Récupérer mon rendu pour un devoir
- **Méthode**: `GET`
- **URL**: `/devoirs/:id/soumissions/me`
- **Rôle autorisé**: `ETUDIANT`
- **Paramètres d'URL**:
  - `id`: ID du devoir

#### Réponse (200)
```json
{
  "message": "Votre rendu a été récupéré avec succès",
  "data": {
    "id": 1,
    "comment": "Voici mon rendu pour le TP",
    "devoir": { "id": 1, "title": "TP Algorithmique" },
    "etudiant": { "id": 1 },
    "document": { "id": 2, "title": "Rendu Paul Martin" },
    "submittedAt": "2026-06-10T14:00:00Z",
    "updatedAt": "2026-06-10T14:00:00Z"
  }
}
```

---

### 10. Supprimer une soumission
- **Méthode**: `DELETE`
- **URL**: `/devoirs/soumissions/:id`
- **Rôle autorisé**: `ETUDIANT`
- **Paramètres d'URL**:
  - `id`: ID de la soumission

#### Réponse (200)
```json
{
  "message": "Rendu supprimé avec succès"
}
```
