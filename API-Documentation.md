# Documentation des API pour Frontend

## Authentification
Toutes les requêtes API nécessitent un token d'authentification JWT dans le header `Authorization` :
```
Authorization: Bearer <votre_token>
```

---

## Table des matières
1. [Devoirs](#devoirs)
2. [Bulletins](#bulletins)
3. [Certificats](#certificats)
4. [Emploi du temps](#emploi-du-temps)
5. [Finance](#finance)
6. [Documents](#documents)
7. [Parents](#parents)
8. [Discipline (Sanctions/Règles)](#discipline-sanctionsrègles)
9. [Notes](#notes)

---

## Devoirs
**Base URL** : `/devoirs`

### Endpoints

#### Créer un devoir
- **Méthode** : `POST`
- **URL** : `/devoirs`
- **Permissions requises** : `ACADEMIC_MANAGE`
- **Corps de la requête** :
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

#### Lister les devoirs
- **Méthode** : `GET`
- **URL** : `/devoirs`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`
- **Paramètres de requête** :
  - `page` (optionnel) : Numéro de page pour la pagination
  - `limit` (optionnel) : Nombre d'éléments par page

#### Lister les devoirs par classe et niveau
- **Méthode** : `GET`
- **URL** : `/devoirs/classe/:classeId/niveau/:niveauId`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`
- **Paramètres d'URL** :
  - `classeId` : ID de la classe
  - `niveauId` : ID du niveau

#### Récupérer un devoir par ID
- **Méthode** : `GET`
- **URL** : `/devoirs/:id`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`
- **Paramètres d'URL** :
  - `id` : ID du devoir

#### Modifier un devoir
- **Méthode** : `PATCH`
- **URL** : `/devoirs/:id`
- **Permissions requises** : `ACADEMIC_MANAGE`
- **Corps de la requête** : Même structure que la création (tous champs optionnels)

#### Supprimer un devoir
- **Méthode** : `DELETE`
- **URL** : `/devoirs/:id`
- **Permissions requises** : `ACADEMIC_MANAGE`

---

### Soumissions de devoirs

#### Soumettre un rendu
- **Méthode** : `POST`
- **URL** : `/devoirs/:id/soumissions`
- **Rôle autorisé** : `ETUDIANT`
- **Paramètres d'URL** :
  - `id` : ID du devoir
- **Corps de la requête** :
```json
{
  "documentId": 1,
  "comment": "Voici mon rendu pour le TP."
}
```

#### Lister les rendus pour un devoir
- **Méthode** : `GET`
- **URL** : `/devoirs/:id/soumissions`
- **Permissions requises** : `ACADEMIC_MANAGE`

#### Récupérer mon rendu
- **Méthode** : `GET`
- **URL** : `/devoirs/:id/soumissions/me`
- **Rôle autorisé** : `ETUDIANT`

#### Supprimer une soumission
- **Méthode** : `DELETE`
- **URL** : `/devoirs/soumissions/:id`
- **Rôle autorisé** : `ETUDIANT`

---

## Bulletins
**Base URL** : `/bulletins`

### Endpoints

#### Récupérer un bulletin (JSON)
- **Méthode** : `GET`
- **URL** : `/bulletins/etudiant/:etudiantId/semestre/:semestreId`
- **Rôles autorisés** : `PARENT`, `ETUDIANT`
- **Permissions requises** : `ACADEMIC_VIEW`
- **Paramètres d'URL** :
  - `etudiantId` : ID de l'étudiant
  - `semestreId` : ID du semestre

#### Télécharger un bulletin (PDF)
- **Méthode** : `GET`
- **URL** : `/bulletins/etudiant/:etudiantId/semestre/:semestreId/pdf`
- **Rôles autorisés** : `PARENT`, `ETUDIANT`
- **Permissions requises** : `ACADEMIC_VIEW`
- **Réponse** : Fichier PDF téléchargeable

---

## Certificats
**Base URL** : `/certificates`

### Endpoints

#### Générer un certificat de scolarité
- **Méthode** : `GET`
- **URL** : `/certificates/scolarity/:etudiantId`
- **Rôle autorisé** : `ETUDIANT`
- **Permissions requises** : `STUDENT_VIEW`
- **Paramètres d'URL** :
  - `etudiantId` : ID de l'étudiant

#### Générer une attestation de réussite
- **Méthode** : `GET`
- **URL** : `/certificates/success/:etudiantId`
- **Rôle autorisé** : `ETUDIANT`
- **Permissions requises** : `ACADEMIC_VIEW`
- **Paramètres d'URL** :
  - `etudiantId` : ID de l'étudiant
- **Paramètres de requête** :
  - `anneeId` (optionnel) : ID de l'année universitaire (par défaut : année active)

#### Historique des documents
- **Méthode** : `GET`
- **URL** : `/certificates/history`
- **Permissions requises** : `STUDENT_VIEW`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)
  - `etudiantId` (optionnel) : Filtrer par étudiant

#### Mon historique de documents
- **Méthode** : `GET`
- **URL** : `/certificates/my-history`
- **Rôle autorisé** : `ETUDIANT`

---

## Emploi du temps
**Base URL** : `/emploi-du-temps`

### Endpoints

#### Créer un créneau
- **Méthode** : `POST`
- **URL** : `/emploi-du-temps`
- **Permissions requises** : `SCHEDULE_MANAGE`
- **Corps de la requête** :
```json
{
  "startTime": "2026-06-08T08:00:00Z",
  "endTime": "2026-06-08T10:00:00Z",
  "matiereId": 1,
  "enseignantId": 1,
  "etablissementId": 1,
  "classeId": 1,
  "niveauId": 1,
  "salleId": 1
}
```

#### Lister les créneaux
- **Méthode** : `GET`
- **URL** : `/emploi-du-temps`
- **Rôles autorisés** : `ETUDIANT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)
  - `classeId` (optionnel) : Filtrer par classe
  - `niveauId` (optionnel) : Filtrer par niveau
  - `enseignantId` (optionnel) : Filtrer par enseignant
  - `start` (optionnel) : Date de début (ISO)
  - `end` (optionnel) : Date de fin (ISO)

#### Récupérer un créneau par ID
- **Méthode** : `GET`
- **URL** : `/emploi-du-temps/:id`
- **Rôles autorisés** : `ETUDIANT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`

#### Modifier un créneau
- **Méthode** : `PATCH`
- **URL** : `/emploi-du-temps/:id`
- **Permissions requises** : `SCHEDULE_MANAGE`

#### Supprimer un créneau
- **Méthode** : `DELETE`
- **URL** : `/emploi-du-temps/:id`
- **Permissions requises** : `SCHEDULE_MANAGE`

---

## Finance
**Base URL** : `/finance`

### Frais

#### Créer un type de frais
- **Méthode** : `POST`
- **URL** : `/finance/frais`
- **Permissions requises** : `FINANCE_MANAGE`
- **Corps de la requête** :
```json
{
  "name": "Scolarité Licence 1 Informatique",
  "amount": 500000,
  "type": "SCOLARITE",
  "classeId": 1,
  "niveauId": 1
}
```

#### Lister les frais
- **Méthode** : `GET`
- **URL** : `/finance/frais`
- **Permissions requises** : `FINANCE_VIEW`

---

### Factures

#### Émettre une facture
- **Méthode** : `POST`
- **URL** : `/finance/factures`
- **Permissions requises** : `FINANCE_MANAGE`
- **Corps de la requête** :
```json
{
  "numero": "FAC-2026-0001",
  "etudiantId": 1,
  "dateEmission": "2026-06-09",
  "dateEcheance": "2026-07-09",
  "montantTotal": 500000,
  "status": "BROUILLON",
  "notes": "Notes additionnelles"
}
```

#### Lister les factures
- **Méthode** : `GET`
- **URL** : `/finance/factures`
- **Permissions requises** : `FINANCE_VIEW`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)

#### Récupérer une facture par ID
- **Méthode** : `GET`
- **URL** : `/finance/factures/:id`
- **Rôles autorisés** : `PARENT`, `ETUDIANT`
- **Permissions requises** : `FINANCE_VIEW`

#### Télécharger la quittance
- **Méthode** : `GET`
- **URL** : `/finance/factures/:id/quittance`
- **Rôles autorisés** : `PARENT`, `ETUDIANT`
- **Permissions requises** : `FINANCE_VIEW`

#### Générer la quittance
- **Méthode** : `POST`
- **URL** : `/finance/factures/:id/generate-quittance`
- **Permissions requises** : `FINANCE_MANAGE`

#### Uploader une quittance
- **Méthode** : `POST`
- **URL** : `/finance/factures/:id/quittance/upload`
- **Permissions requises** : `FINANCE_MANAGE`
- **Content-Type** : `multipart/form-data`
- **Champs** :
  - `file` : Fichier de quittance

---

### Paiements

#### Enregistrer un paiement
- **Méthode** : `POST`
- **URL** : `/finance/paiements`
- **Permissions requises** : `FINANCE_MANAGE`
- **Corps de la requête** :
```json
{
  "reference": "PAY-2026-0001",
  "etudiantId": 1,
  "factureId": 1,
  "montant": 100000,
  "datePaiement": "2026-06-09",
  "modePaiement": "ESPECES"
}
```

#### Lister les paiements
- **Méthode** : `GET`
- **URL** : `/finance/paiements`
- **Permissions requises** : `FINANCE_VIEW`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)

#### Télécharger le reçu
- **Méthode** : `GET`
- **URL** : `/finance/paiements/:id/recu`
- **Rôles autorisés** : `PARENT`, `ETUDIANT`
- **Permissions requises** : `FINANCE_VIEW`

#### Générer le reçu
- **Méthode** : `POST`
- **URL** : `/finance/paiements/:id/generate-recu`
- **Permissions requises** : `FINANCE_MANAGE`

#### Uploader un reçu
- **Méthode** : `POST`
- **URL** : `/finance/paiements/:id/recu/upload`
- **Permissions requises** : `FINANCE_MANAGE`
- **Content-Type** : `multipart/form-data`
- **Champs** :
  - `file` : Fichier de reçu

---

### Rapports & Dashboard

#### Dashboard financier
- **Méthode** : `GET`
- **URL** : `/finance/dashboard`
- **Permissions requises** : `FINANCE_REPORT`

#### Rapport financier
- **Méthode** : `GET`
- **URL** : `/finance/report`
- **Permissions requises** : `FINANCE_REPORT`
- **Paramètres de requête** :
  - `start` (optionnel) : Date de début (YYYY-MM-DD)
  - `end` (optionnel) : Date de fin (YYYY-MM-DD)

#### Factures impayées
- **Méthode** : `GET`
- **URL** : `/finance/unpaid`
- **Permissions requises** : `FINANCE_VIEW`
- **Paramètres de requête** :
  - `classeId` (optionnel)
  - `niveauId` (optionnel)

---

## Documents
**Base URL** : `/documents`

### Endpoints

#### Uploader un document
- **Méthode** : `POST`
- **URL** : `/documents/upload`
- **Rôles autorisés** : `ADMIN`, `ENSEIGNANT`, `SUPER_ADMIN`
- **Permissions requises** : `DOCUMENT_MANAGE`, `ACADEMIC_MANAGE`
- **Content-Type** : `multipart/form-data`
- **Champs** :
  - `file` : Fichier (max 10MB)
  - `title` : Titre du document
  - `description` (optionnel) : Description
  - `category` (optionnel) : Catégorie (`Administratif`, `Pédagogique`, `Règlement`, `Autre`)

#### Uploader un rendu (étudiant)
- **Méthode** : `POST`
- **URL** : `/documents/upload/rendu`
- **Rôle autorisé** : `ETUDIANT`
- **Content-Type** : `multipart/form-data`
- **Champs** :
  - `file` : Fichier
  - `title` (optionnel)
  - `description` (optionnel)

#### Lister les documents
- **Méthode** : `GET`
- **URL** : `/documents`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`, `COMPTABLE`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)

#### Récupérer un document par ID
- **Méthode** : `GET`
- **URL** : `/documents/:id`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `ADMIN`, `SURVEILLANT`, `COMPTABLE`

#### Modifier un document
- **Méthode** : `PATCH`
- **URL** : `/documents/:id`
- **Permissions requises** : `DOCUMENT_MANAGE`
- **Corps de la requête** :
```json
{
  "title": "Nouveau titre",
  "description": "Nouvelle description",
  "category": "Pédagogique"
}
```

#### Supprimer un document
- **Méthode** : `DELETE`
- **URL** : `/documents/:id`
- **Permissions requises** : `DOCUMENT_MANAGE`

---

## Parents
**Base URL** : `/parents`

### Endpoints

#### Créer un parent
- **Méthode** : `POST`
- **URL** : `/parents`
- **Permissions requises** : `STUDENT_CREATE`
- **Corps de la requête** :
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

#### Lister les contacts parents
- **Méthode** : `GET`
- **URL** : `/parents/contacts`
- **Permissions requises** : `STUDENT_VIEW`
- **Paramètres de requête** :
  - `search` (optionnel) : Recherche par nom, étudiant ou matricule

#### Lister tous les parents
- **Méthode** : `GET`
- **URL** : `/parents`
- **Permissions requises** : `STUDENT_VIEW`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)

#### Récupérer un parent par ID
- **Méthode** : `GET`
- **URL** : `/parents/:id`
- **Permissions requises** : `STUDENT_VIEW`

#### Modifier un parent
- **Méthode** : `PATCH`
- **URL** : `/parents/:id`
- **Permissions requises** : `STUDENT_EDIT`

#### Supprimer un parent
- **Méthode** : `DELETE`
- **URL** : `/parents/:id`
- **Permissions requises** : `STUDENT_EDIT`

---

## Discipline (Sanctions/Règles)
**Base URL** : `/discipline`

### Endpoints

#### Créer une règle
- **Méthode** : `POST`
- **URL** : `/discipline`
- **Permissions requises** : `DISCIPLINE_MANAGE`
- **Corps de la requête** :
```json
{
  "title": "Retard et Absences",
  "content": "Tout retard de plus de 15 minutes est considéré comme une absence.",
  "category": "Discipline",
  "isActive": true
}
```

#### Lister les règles
- **Méthode** : `GET`
- **URL** : `/discipline`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `SURVEILLANT`
- **Permissions requises** : `DISCIPLINE_MANAGE`
- **Paramètres de requête** :
  - `category` (optionnel) : Filtrer par catégorie (`Règlement Intérieur`, `Discipline`, `Autre`)

#### Récupérer une règle par ID
- **Méthode** : `GET`
- **URL** : `/discipline/:id`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`, `ENSEIGNANT`, `SURVEILLANT`
- **Permissions requises** : `DISCIPLINE_MANAGE`

#### Modifier une règle
- **Méthode** : `PATCH`
- **URL** : `/discipline/:id`
- **Permissions requises** : `DISCIPLINE_MANAGE`

#### Supprimer une règle
- **Méthode** : `DELETE`
- **URL** : `/discipline/:id`
- **Permissions requises** : `DISCIPLINE_MANAGE`

---

## Notes
**Base URL** : `/note`

### Endpoints

#### Enregistrer une note
- **Méthode** : `POST`
- **URL** : `/note`
- **Permissions requises** : `ACADEMIC_MANAGE`
- **Corps de la requête** :
```json
{
  "value": 15.5,
  "remark": "Bon travail",
  "etudiantId": 1,
  "evaluationId": 1
}
```

#### Enregistrer des notes en masse
- **Méthode** : `POST`
- **URL** : `/note/bulk`
- **Permissions requises** : `ACADEMIC_MANAGE`
- **Corps de la requête** :
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
      "value": 12.0
    }
  ]
}
```

#### Lister les notes d'un étudiant
- **Méthode** : `GET`
- **URL** : `/note/etudiant/:etudiantId`
- **Rôles autorisés** : `PARENT`, `ETUDIANT`
- **Paramètres d'URL** :
  - `etudiantId` : ID de l'étudiant
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)

#### Lister les notes
- **Méthode** : `GET`
- **URL** : `/note`
- **Rôles autorisés** : `ETUDIANT`, `PARENT`
- **Permissions requises** : `ACADEMIC_VIEW`
- **Paramètres de requête** :
  - `page` (optionnel)
  - `limit` (optionnel)
  - `etudiantId` (optionnel) : Filtrer par étudiant

#### Récupérer une note par ID
- **Méthode** : `GET`
- **URL** : `/note/:id`
- **Rôle autorisé** : `ETUDIANT`
- **Permissions requises** : `ACADEMIC_VIEW`

#### Modifier une note
- **Méthode** : `PATCH`
- **URL** : `/note/:id`
- **Permissions requises** : `ACADEMIC_MANAGE`

#### Supprimer une note
- **Méthode** : `DELETE`
- **URL** : `/note/:id`
- **Permissions requises** : `ACADEMIC_MANAGE`

---

## Enums utiles

### ParentGender
```typescript
enum ParentGender {
  PERE = 'Père',
  MERE = 'Mère',
  TUTEUR = 'Tuteur'
}
```

### DocumentCategory
```typescript
enum DocumentCategory {
  ADMINISTRATIF = 'Administratif',
  PEDAGOGIQUE = 'Pédagogique',
  REGLEMENT = 'Règlement',
  AUTRE = 'Autre'
}
```

### DisciplineCategory
```typescript
enum DisciplineCategory {
  REGLEMENT_INTERIEUR = 'Règlement Intérieur',
  DISCIPLINE = 'Discipline',
  AUTRE = 'Autre'
}
```

### FeeType
```typescript
enum FeeType {
  SCOLARITE = 'SCOLARITE',
  // Autres types possibles
}
```

### InvoiceStatus
```typescript
enum InvoiceStatus {
  BROUILLON = 'BROUILLON',
  // Autres statuts possibles
}
```

### PaymentMethod
```typescript
enum PaymentMethod {
  ESPECES = 'ESPECES',
  // Autres modes possibles
}
```

---

## Format de réponse standard
Toutes les réponses suivent ce format :

### Succès
```json
{
  "message": "Message de succès",
  "data": { /* Données de réponse */ }
}
```

### Erreur
```json
{
  "statusCode": 400,
  "message": "Message d'erreur",
  "error": "Bad Request"
}
```

---

## Pagination
Pour les endpoints avec pagination, les paramètres de requête sont :
- `page` : Numéro de page (défaut : 1)
- `limit` : Nombre d'éléments par page (défaut : 10)

La réponse contiendra :
```json
{
  "data": [/* Liste des éléments */],
  "total": 100,
  "page": 1,
  "limit": 10
}
```
