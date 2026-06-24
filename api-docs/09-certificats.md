# API Certificats

**Base URL**: `/certificates`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Générer un certificat de scolarité
- **Méthode**: `GET`
- **URL**: `/certificates/scolarity/:etudiantId`
- **Rôle autorisé**: `ETUDIANT`
- **Permissions requises**: `STUDENT_VIEW`
- **Paramètres d'URL**:
  - `etudiantId`: ID de l'étudiant

#### Réponse (200)
```json
{
  "message": "Certificat de scolarité généré avec succès",
  "data": {
    "id": 1,
    "type": "scolarity",
    "etudiant": {
      "id": 1,
      "firstName": "Paul",
      "lastName": "Martin",
      "matricule": "ESP2026001"
    },
    "dateGeneration": "2026-06-10T14:00:00Z",
    "filePath": "uploads/certificates/scolarity-1.pdf"
  }
}
```

---

### 2. Générer une attestation de réussite
- **Méthode**: `GET`
- **URL**: `/certificates/success/:etudiantId`
- **Rôle autorisé**: `ETUDIANT`
- **Permissions requises**: `ACADEMIC_VIEW`
- **Paramètres d'URL**:
  - `etudiantId`: ID de l'étudiant
- **Paramètres de requête**:
  - `anneeId` (optionnel): ID de l'année universitaire (par défaut: année active)

#### Réponse (200)
```json
{
  "message": "Attestation de réussite générée avec succès",
  "data": {
    "id": 2,
    "type": "success",
    "etudiant": {
      "id": 1,
      "firstName": "Paul",
      "lastName": "Martin",
      "matricule": "ESP2026001"
    },
    "anneeUniversitaire": {
      "id": 1,
      "name": "2025-2026"
    },
    "dateGeneration": "2026-06-10T14:30:00Z",
    "filePath": "uploads/certificates/success-1.pdf"
  }
}
```

---

### 3. Consulter l'historique des documents générés
- **Méthode**: `GET`
- **URL**: `/certificates/history`
- **Permissions requises**: `STUDENT_VIEW`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)
  - `etudiantId` (optionnel): Filtrer par étudiant

#### Réponse (200)
```json
{
  "message": "Historique des documents récupéré avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "type": "scolarity",
        "etudiant": {
          "id": 1,
          "firstName": "Paul",
          "lastName": "Martin"
        },
        "dateGeneration": "2026-06-10T14:00:00Z",
        "filePath": "uploads/certificates/scolarity-1.pdf"
      },
      {
        "id": 2,
        "type": "success",
        "etudiant": {
          "id": 1,
          "firstName": "Paul",
          "lastName": "Martin"
        },
        "dateGeneration": "2026-06-10T14:30:00Z",
        "filePath": "uploads/certificates/success-1.pdf"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 15
  }
}
```

---

### 4. Consulter mon historique de documents (Étudiant)
- **Méthode**: `GET`
- **URL**: `/certificates/my-history`
- **Rôle autorisé**: `ETUDIANT`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)

#### Réponse (200)
```json
{
  "message": "Mon historique de documents récupéré avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "type": "scolarity",
        "dateGeneration": "2026-06-10T14:00:00Z",
        "filePath": "uploads/certificates/scolarity-1.pdf"
      },
      {
        "id": 2,
        "type": "success",
        "dateGeneration": "2026-06-10T14:30:00Z",
        "filePath": "uploads/certificates/success-1.pdf"
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 15
  }
}
```
