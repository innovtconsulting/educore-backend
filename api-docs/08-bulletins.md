# API Bulletins

**Base URL**: `/bulletins`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Endpoints

### 1. Générer le bulletin de notes (JSON)
- **Méthode**: `GET`
- **URL**: `/bulletins/etudiant/:etudiantId/semestre/:semestreId`
- **Rôles autorisés**: `PARENT`, `ETUDIANT`
- **Permissions requises**: `ACADEMIC_VIEW`
- **Paramètres d'URL**:
  - `etudiantId`: ID de l'étudiant
  - `semestreId`: ID du semestre

#### Réponse (200)
```json
{
  "message": "Bulletin de notes généré avec succès",
  "data": {
    "etudiant": {
      "id": 1,
      "firstName": "Paul",
      "lastName": "Martin",
      "matricule": "ESP2026001"
    },
    "semestre": {
      "id": 1,
      "name": "Semestre 1"
    },
    "notes": [
      {
        "id": 1,
        "value": 15.5,
        "remark": "Bon travail",
        "evaluation": {
          "id": 1,
          "title": "DS1 Algorithmique",
          "matiere": {
            "id": 1,
            "name": "Algorithmique"
          }
        }
      },
      {
        "id": 2,
        "value": 12.0,
        "remark": "Peut mieux faire",
        "evaluation": {
          "id": 2,
          "title": "DS2 Mathématiques",
          "matiere": {
            "id": 2,
            "name": "Mathématiques"
          }
        }
      }
    ],
    "moyenneGenerale": 13.75
  }
}
```

---

### 2. Générer le bulletin de notes (PDF)
- **Méthode**: `GET`
- **URL**: `/bulletins/etudiant/:etudiantId/semestre/:semestreId/pdf`
- **Rôles autorisés**: `PARENT`, `ETUDIANT`
- **Permissions requises**: `ACADEMIC_VIEW`
- **Paramètres d'URL**:
  - `etudiantId`: ID de l'étudiant
  - `semestreId`: ID du semestre

#### Réponse
Fichier PDF téléchargeable
