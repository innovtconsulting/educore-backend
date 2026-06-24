# API Changes - Migration Hiérarchique + Filtres

## 1. Résumé

Ce document décrit les modifications de l'API suite à la migration des relations ManyToMany vers une hiérarchie stricte (Établissement → Parcours/Classe → Niveau → Matière) et l'ajout de filtres de query sur les endpoints de listing.

- **Changements majeurs** :
  - Un Parcours appartient maintenant à un seul Établissement (relation ManyToOne)
  - Un Niveau appartient maintenant à un seul Parcours (relation ManyToOne)
  - Une Matière appartient maintenant à un seul Niveau (relation ManyToOne)
  - Ajout de filtres de navigation hiérarchique sur les endpoints de listing

---

## 2. Ressources Impactées

---

### 2.1 Établissement
*(Pas de modifications majeures, sauf si vous utilisiez des relations ManyToMany avant)*

---

### 2.2 Classe (Parcours)

#### Endpoint : `GET /classe`
- **Statut** : MODIFIÉ (ajout de filtre)
- **Nouveau query param** :
  - `etablissementId` (number, optionnel) : ID de l'établissement pour filtrer les parcours
- **Exemple de requête** :
  ```bash
  curl -X GET "http://localhost:3000/api/classe?etablissementId=1" \
    -H "Authorization: Bearer <token>"
  ```
- **Exemple de réponse** :
  ```json
  {
    "message": "Liste des parcours (classes) récupérée avec succès",
    "data": [
      {
        "id": 1,
        "name": "Informatique",
        "etablissement": {
          "id": 1,
          "name": "Faculté des Sciences et Techniques (FST)"
        }
      }
    ]
  }
  ```
- **Breaking change ?** : NON (juste un ajout de filtre optionnel)

---

### 2.3 Niveau

#### Endpoint : `GET /niveau`
- **Statut** : MODIFIÉ (ajout de filtre)
- **Nouveaux query params** :
  - `parcoursId` (number, optionnel) : ID du parcours pour filtrer les niveaux
  - `search` (string, optionnel) : Recherche par nom du niveau
  - `page` (number, optionnel, défaut: 1) : Numéro de page pour la pagination
  - `limit` (number, optionnel, défaut: 20) : Nombre d'éléments par page
- **Exemple de requête** :
  ```bash
  curl -X GET "http://localhost:3000/api/niveau?parcoursId=1" \
    -H "Authorization: Bearer <token>"
  ```
- **Exemple de réponse** :
  ```json
  {
    "message": "Liste des niveaux récupérée avec succès",
    "data": {
      "items": [
        {
          "id": 1,
          "name": "L1",
          "classe": {
            "id": 1,
            "name": "Informatique"
          }
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
  }
  ```
- **Breaking change ?** : NON (juste un ajout de filtres optionnels)

#### Endpoint : `POST /niveau`
- **Statut** : MODIFIÉ (changement de structure)
- **Avant** :
  ```json
  {
    "name": "L1",
    "parcoursIds": [1] // Tableau d'IDs
  }
  ```
- **Après** :
  ```json
  {
    "name": "L1",
    "parcoursId": 1 // ID unique
  }
  ```
- **Champs impactés** :
  - `parcoursIds: number[]` → `parcoursId: number` (obligatoire)
- **Exemple de requête** :
  ```bash
  curl -X POST "http://localhost:3000/api/niveau" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{
      "name": "L1",
      "parcoursId": 1
    }'
  ```
- **Breaking change ?** : OUI (le champ `parcoursIds` n'existe plus, `parcoursId` est obligatoire)

#### Endpoint : `PATCH /niveau/:id`
- **Statut** : MODIFIÉ (changement de structure)
- **Même changement que POST** : `parcoursIds` → `parcoursId`
- **Breaking change ?** : OUI (si vous utilisiez `parcoursIds` avant)

---

### 2.4 Matière

#### Endpoint : `GET /matiere`
- **Statut** : MODIFIÉ (ajout de filtres)
- **Nouveaux query params** :
  - `niveauId` (number, optionnel) : ID du niveau pour filtrer les matières
  - `parcoursId` (number, optionnel) : ID du parcours pour filtrer les matières (via la relation niveau → parcours)
  - `search` (string, optionnel) : Recherche par nom ou code de la matière
  - `page` (number, optionnel, défaut: 1) : Numéro de page pour la pagination
  - `limit` (number, optionnel, défaut: 20) : Nombre d'éléments par page
- **Exemples de requêtes** :
  1. Filtrer par niveau :
     ```bash
     curl -X GET "http://localhost:3000/api/matiere?niveauId=1" \
       -H "Authorization: Bearer <token>"
     ```
  2. Filtrer par parcours :
     ```bash
     curl -X GET "http://localhost:3000/api/matiere?parcoursId=1" \
       -H "Authorization: Bearer <token>"
     ```
- **Exemple de réponse** :
  ```json
  {
    "message": "Liste des matières récupérée avec succès",
    "data": {
      "items": [
        {
          "id": 1,
          "code": "INF101",
          "name": "Algorithmique",
          "coefficient": 2.0,
          "niveau": {
            "id": 1,
            "name": "L1",
            "classe": {
              "id": 1,
              "name": "Informatique"
            }
          }
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
  }
  ```
- **Breaking change ?** : NON (juste un ajout de filtres optionnels)

#### Endpoint : `POST /matiere`
- **Statut** : MODIFIÉ (changement de structure)
- **Avant** :
  ```json
  {
    "code": "INF101",
    "name": "Algorithmique",
    "coefficient": 2.0,
    "niveauIds": [1] // Tableau d'IDs
  }
  ```
- **Après** :
  ```json
  {
    "code": "INF101",
    "name": "Algorithmique",
    "coefficient": 2.0,
    "niveauId": 1 // ID unique
  }
  ```
- **Champs impactés** :
  - `niveauIds: number[]` → `niveauId: number` (obligatoire)
- **Exemple de requête** :
  ```bash
  curl -X POST "http://localhost:3000/api/matiere" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{
      "code": "INF101",
      "name": "Algorithmique",
      "coefficient": 2.0,
      "niveauId": 1
    }'
  ```
- **Breaking change ?** : OUI (le champ `niveauIds` n'existe plus, `niveauId` est obligatoire)

#### Endpoint : `PATCH /matiere/:id`
- **Statut** : MODIFIÉ (changement de structure)
- **Même changement que POST** : `niveauIds` → `niveauId`
- **Breaking change ?** : OUI (si vous utilisiez `niveauIds` avant)

---

### 2.5 Enseignant

#### Endpoint : `GET /enseignants`
- **Statut** : MODIFIÉ (ajout de filtres)
- **Nouveaux query params** :
  - `etablissementId` (number, optionnel) : ID de l'établissement pour filtrer les enseignants
  - `matiereId` (number, optionnel) : ID de la matière pour filtrer les enseignants
  - `search` (string, optionnel) : Recherche par prénom, nom, matricule ou email
  - `page` (number, optionnel, défaut: 1) : Numéro de page pour la pagination
  - `limit` (number, optionnel, défaut: 20) : Nombre d'éléments par page
- **Exemples de requêtes** :
  1. Filtrer par établissement :
     ```bash
     curl -X GET "http://localhost:3000/api/enseignants?etablissementId=1" \
       -H "Authorization: Bearer <token>"
     ```
  2. Filtrer par matière :
     ```bash
     curl -X GET "http://localhost:3000/api/enseignants?matiereId=1" \
       -H "Authorization: Bearer <token>"
     ```
  3. Filtrer par établissement et matière :
     ```bash
     curl -X GET "http://localhost:3000/api/enseignants?etablissementId=1&matiereId=1" \
       -H "Authorization: Bearer <token>"
     ```
- **Breaking change ?** : NON (juste un ajout de filtres optionnels)

---

## 3. Filtres Combinés pour la Navigation Hiérarchique

Voici tous les cas d'usage avec des exemples d'URL :

1. **Lister tous les parcours d'un établissement** :
   ```
   GET /api/classe?etablissementId=1
   ```

2. **Lister tous les niveaux d'un parcours** :
   ```
   GET /api/niveau?parcoursId=1
   ```

3. **Lister toutes les matières d'un niveau** :
   ```
   GET /api/matiere?niveauId=1
   ```

4. **Lister toutes les matières d'un parcours** (sans préciser le niveau) :
   ```
   GET /api/matiere?parcoursId=1
   ```

5. **Rechercher un niveau par nom** :
   ```
   GET /api/niveau?search=L1
   ```

6. **Rechercher une matière par nom ou code** :
   ```
   GET /api/matiere?search=Algorithmique
   ```

7. **Lister tous les enseignants d'un établissement** :
   ```
   GET /api/enseignants?etablissementId=1
   ```

8. **Lister tous les enseignants d'une matière** :
   ```
   GET /api/enseignants?matiereId=1
   ```

9. **Lister tous les enseignants d'un établissement et d'une matière** :
   ```
   GET /api/enseignants?etablissementId=1&matiereId=1
   ```

---

## 4. Endpoints ou Comportements Supprimés

Les endpoints de gestion des relations ManyToMany (ex: `POST /niveau/:id/parcours/:parcoursId`) ont été supprimés, car la hiérarchie est maintenant stricte (un enfant ne peut appartenir qu'à un seul parent).

---

## 5. Checklist Récapitulative pour le Frontend

- [ ] Adapter les formulaires de création/modification de Niveau pour utiliser `parcoursId` au lieu de `parcoursIds`
- [ ] Adapter les formulaires de création/modification de Matière pour utiliser `niveauId` au lieu de `niveauIds`
- [ ] Utiliser les nouveaux filtres de query pour la navigation hiérarchique
- [ ] Tester les modifications pour éviter les erreurs de validation
