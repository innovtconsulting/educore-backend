# API Parents

**Base URL**: `/parents`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Créer un parent
- **Méthode**: `POST`
- **URL**: `/parents`
- **Permissions requises**: `STUDENT_CREATE`

#### Requête
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "gender": "Père",
  "email": "jean.dupont@email.com",
  "phoneNumber": "+221 77 123 45 67",
  "address": "Dakar, Plateau",
  "job": "Ingénieur"
}
```

#### Réponse (201)
```json
{
  "id": 1,
  "firstName": "Jean",
  "lastName": "Dupont",
  "gender": "Père",
  "email": "jean.dupont@email.com",
  "phoneNumber": "+221 77 123 45 67",
  "address": "Dakar, Plateau",
  "job": "Ingénieur",
  "etudiants": [],
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 2. Lister les contacts parents
- **Méthode**: `GET`
- **URL**: `/parents/contacts`
- **Permissions requises**: `STUDENT_VIEW`
- **Paramètres de requête**:
  - `search` (optionnel): Recherche par nom parent, nom étudiant ou matricule

#### Réponse (200)
```json
[
  {
    "id": 1,
    "firstName": "Jean",
    "lastName": "Dupont",
    "phoneNumber": "+221 77 123 45 67",
    "email": "jean.dupont@email.com",
    "gender": "Père",
    "etudiants": [
      {
        "id": 1,
        "firstName": "Paul",
        "lastName": "Martin",
        "matricule": "ESP2026001"
      }
    ]
  }
]
```

---

### 3. Lister tous les parents
- **Méthode**: `GET`
- **URL**: `/parents`
- **Permissions requises**: `STUDENT_VIEW`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)

#### Réponse (200)
```json
{
  "items": [
    {
      "id": 1,
      "firstName": "Jean",
      "lastName": "Dupont",
      "gender": "Père",
      "email": "jean.dupont@email.com",
      "phoneNumber": "+221 77 123 45 67",
      "address": "Dakar, Plateau",
      "job": "Ingénieur",
      "etudiants": [
        {
          "id": 1,
          "firstName": "Paul",
          "lastName": "Martin"
        }
      ],
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

### 4. Récupérer un parent par ID
- **Méthode**: `GET`
- **URL**: `/parents/:id`
- **Permissions requises**: `STUDENT_VIEW`
- **Paramètres d'URL**:
  - `id`: ID du parent

#### Réponse (200)
```json
{
  "id": 1,
  "firstName": "Jean",
  "lastName": "Dupont",
  "gender": "Père",
  "email": "jean.dupont@email.com",
  "phoneNumber": "+221 77 123 45 67",
  "address": "Dakar, Plateau",
  "job": "Ingénieur",
  "etudiants": [
    {
      "id": 1,
      "firstName": "Paul",
      "lastName": "Martin",
      "matricule": "ESP2026001"
    }
  ],
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 5. Modifier un parent
- **Méthode**: `PATCH`
- **URL**: `/parents/:id`
- **Permissions requises**: `STUDENT_EDIT`
- **Paramètres d'URL**:
  - `id`: ID du parent

#### Requête
```json
{
  "phoneNumber": "+221 77 987 65 43",
  "address": "Dakar, Medina"
}
```

#### Réponse (200)
```json
{
  "id": 1,
  "firstName": "Jean",
  "lastName": "Dupont",
  "gender": "Père",
  "email": "jean.dupont@email.com",
  "phoneNumber": "+221 77 987 65 43",
  "address": "Dakar, Medina",
  "job": "Ingénieur",
  "etudiants": [],
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-09T15:30:00Z"
}
```

---

### 6. Supprimer un parent
- **Méthode**: `DELETE`
- **URL**: `/parents/:id`
- **Permissions requises**: `STUDENT_EDIT`
- **Paramètres d'URL**:
  - `id`: ID du parent

#### Réponse (200)
Pas de contenu (204 No Content)
