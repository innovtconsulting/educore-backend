# API Discipline

**Base URL**: `/discipline`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Créer une règle de discipline
- **Méthode**: `POST`
- **URL**: `/discipline`
- **Permissions requises**: `DISCIPLINE_MANAGE`

#### Requête
```json
{
  "title": "Retard et Absences",
  "content": "Tout retard de plus de 15 minutes est considéré comme une absence. Trois absences non justifiées entraînent un avertissement.",
  "category": "Discipline",
  "isActive": true
}
```

#### Réponse (201)
```json
{
  "id": 1,
  "title": "Retard et Absences",
  "content": "Tout retard de plus de 15 minutes est considéré comme une absence. Trois absences non justifiées entraînent un avertissement.",
  "category": "Discipline",
  "isActive": true,
  "etablissement": { "id": 1 },
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 2. Lister toutes les règles
- **Méthode**: `GET`
- **URL**: `/discipline`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `SURVEILLANT`
- **Permissions requises**: `DISCIPLINE_MANAGE`
- **Paramètres de requête**:
  - `category` (optionnel): Filtrer par catégorie (`Règlement Intérieur`, `Discipline`, `Autre`)

#### Réponse (200)
```json
[
  {
    "id": 1,
    "title": "Retard et Absences",
    "content": "Tout retard de plus de 15 minutes est considéré comme une absence. Trois absences non justifiées entraînent un avertissement.",
    "category": "Discipline",
    "isActive": true,
    "etablissement": { "id": 1 },
    "createdAt": "2026-06-08T10:00:00Z",
    "updatedAt": "2026-06-08T10:00:00Z"
  },
  {
    "id": 2,
    "title": "Tenue Vestimentaire",
    "content": "Le port de la blouse est obligatoire dans les laboratoires.",
    "category": "Règlement Intérieur",
    "isActive": true,
    "etablissement": { "id": 1 },
    "createdAt": "2026-06-08T11:00:00Z",
    "updatedAt": "2026-06-08T11:00:00Z"
  }
]
```

---

### 3. Récupérer une règle par ID
- **Méthode**: `GET`
- **URL**: `/discipline/:id`
- **Rôles autorisés**: `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `SURVEILLANT`
- **Permissions requises**: `DISCIPLINE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID de la règle

#### Réponse (200)
```json
{
  "id": 1,
  "title": "Retard et Absences",
  "content": "Tout retard de plus de 15 minutes est considéré comme une absence. Trois absences non justifiées entraînent un avertissement.",
  "category": "Discipline",
  "isActive": true,
  "etablissement": { "id": 1 },
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-08T10:00:00Z"
}
```

---

### 4. Modifier une règle
- **Méthode**: `PATCH`
- **URL**: `/discipline/:id`
- **Permissions requises**: `DISCIPLINE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID de la règle

#### Requête
```json
{
  "title": "Retard et Absences (Modifié)",
  "content": "Tout retard de plus de 10 minutes est considéré comme une absence.",
  "isActive": true
}
```

#### Réponse (200)
```json
{
  "id": 1,
  "title": "Retard et Absences (Modifié)",
  "content": "Tout retard de plus de 10 minutes est considéré comme une absence.",
  "category": "Discipline",
  "isActive": true,
  "etablissement": { "id": 1 },
  "createdAt": "2026-06-08T10:00:00Z",
  "updatedAt": "2026-06-09T15:30:00Z"
}
```

---

### 5. Supprimer une règle
- **Méthode**: `DELETE`
- **URL**: `/discipline/:id`
- **Permissions requises**: `DISCIPLINE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID de la règle

#### Réponse (200)
```json
{
  "message": "Règle supprimée avec succès"
}
```
