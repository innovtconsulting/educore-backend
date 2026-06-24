# API Finance

**Base URL**: `/finance`

## Authentification
Toutes les requêtes nécessitent un token JWT dans le header `Authorization`.

---

## Frais

### 1. Créer un type de frais
- **Méthode**: `POST`
- **URL**: `/finance/frais`
- **Permissions requises**: `FINANCE_MANAGE`

#### Requête
```json
{
  "name": "Scolarité Licence 1 Informatique",
  "amount": 500000,
  "type": "SCOLARITE",
  "classeId": 1,
  "niveauId": 1
}
```

#### Réponse (201)
```json
{
  "message": "Frais créé avec succès",
  "data": {
    "id": 1,
    "name": "Scolarité Licence 1 Informatique",
    "amount": 500000,
    "type": "SCOLARITE",
    "classe": { "id": 1, "name": "Classe A" },
    "niveau": { "id": 1, "name": "L1" },
    "etablissement": { "id": 1 }
  }
}
```

---

### 2. Récupérer tous les frais
- **Méthode**: `GET`
- **URL**: `/finance/frais`
- **Permissions requises**: `FINANCE_VIEW`

#### Réponse (200)
```json
{
  "message": "Liste des frais récupérée avec succès",
  "data": [
    {
      "id": 1,
      "name": "Scolarité Licence 1 Informatique",
      "amount": 500000,
      "type": "SCOLARITE",
      "classe": { "id": 1, "name": "Classe A" },
      "niveau": { "id": 1, "name": "L1" },
      "etablissement": { "id": 1 }
    }
  ]
}
```

---

## Factures

### 3. Émettre une facture
- **Méthode**: `POST`
- **URL**: `/finance/factures`
- **Permissions requises**: `FINANCE_MANAGE`

#### Requête
```json
{
  "numero": "FAC-2026-0001",
  "etudiantId": 1,
  "dateEmission": "2026-06-08",
  "dateEcheance": "2026-07-08",
  "montantTotal": 500000,
  "status": "VALIDE",
  "notes": "Frais de scolarité semestre 1"
}
```

#### Réponse (201)
```json
{
  "message": "Facture émise avec succès",
  "data": {
    "id": 1,
    "numero": "FAC-2026-0001",
    "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
    "dateEmission": "2026-06-08T00:00:00Z",
    "dateEcheance": "2026-07-08T00:00:00Z",
    "montantTotal": 500000,
    "status": "VALIDE",
    "notes": "Frais de scolarité semestre 1",
    "paiements": [],
    "quittancePath": null
  }
}
```

---

### 4. Récupérer toutes les factures
- **Méthode**: `GET`
- **URL**: `/finance/factures`
- **Permissions requises**: `FINANCE_VIEW`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)

#### Réponse (200)
```json
{
  "message": "Liste des factures récupérée avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "numero": "FAC-2026-0001",
        "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
        "dateEmission": "2026-06-08T00:00:00Z",
        "dateEcheance": "2026-07-08T00:00:00Z",
        "montantTotal": 500000,
        "status": "VALIDE",
        "notes": "Frais de scolarité semestre 1",
        "paiements": [],
        "quittancePath": null
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 15
  }
}
```

---

### 5. Récupérer une facture par ID
- **Méthode**: `GET`
- **URL**: `/finance/factures/:id`
- **Rôles autorisés**: `PARENT`, `ETUDIANT`
- **Permissions requises**: `FINANCE_VIEW`
- **Paramètres d'URL**:
  - `id`: ID de la facture

#### Réponse (200)
```json
{
  "message": "Facture #1 récupérée avec succès",
  "data": {
    "id": 1,
    "numero": "FAC-2026-0001",
    "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
    "dateEmission": "2026-06-08T00:00:00Z",
    "dateEcheance": "2026-07-08T00:00:00Z",
    "montantTotal": 500000,
    "status": "VALIDE",
    "notes": "Frais de scolarité semestre 1",
    "paiements": [],
    "quittancePath": null
  }
}
```

---

### 6. Générer la quittance d'une facture
- **Méthode**: `POST`
- **URL**: `/finance/factures/:id/generate-quittance`
- **Permissions requises**: `FINANCE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID de la facture

#### Réponse (200)
```json
{
  "message": "Quittance générée avec succès",
  "data": {
    "id": 1,
    "numero": "FAC-2026-0001",
    "status": "PAYE",
    "quittancePath": "uploads/receipts/quittance-1.pdf"
  }
}
```

---

### 7. Télécharger la quittance d'une facture
- **Méthode**: `GET`
- **URL**: `/finance/factures/:id/quittance`
- **Rôles autorisés**: `PARENT`, `ETUDIANT`
- **Permissions requises**: `FINANCE_VIEW`
- **Paramètres d'URL**:
  - `id`: ID de la facture

#### Réponse
Fichier PDF téléchargeable

---

### 8. Uploader une quittance manuelle
- **Méthode**: `POST`
- **URL**: `/finance/factures/:id/quittance/upload`
- **Permissions requises**: `FINANCE_MANAGE`
- **Content-Type**: `multipart/form-data`
- **Paramètres d'URL**:
  - `id`: ID de la facture
- **Champs form-data**:
  - `file`: Fichier de quittance (PDF)

#### Réponse (200)
```json
{
  "message": "Quittance uploadée avec succès",
  "data": {
    "id": 1,
    "numero": "FAC-2026-0001",
    "quittancePath": "uploads/receipts/manual-quittance-123456.pdf"
  }
}
```

---

## Paiements

### 9. Enregistrer un paiement
- **Méthode**: `POST`
- **URL**: `/finance/paiements`
- **Permissions requises**: `FINANCE_MANAGE`

#### Requête
```json
{
  "reference": "PAY-2026-0001",
  "etudiantId": 1,
  "factureId": 1,
  "montant": 250000,
  "datePaiement": "2026-06-10",
  "modePaiement": "ESPECES"
}
```

#### Réponse (201)
```json
{
  "message": "Paiement enregistré avec succès",
  "data": {
    "id": 1,
    "reference": "PAY-2026-0001",
    "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
    "facture": { "id": 1, "numero": "FAC-2026-0001" },
    "montant": 250000,
    "datePaiement": "2026-06-10T00:00:00Z",
    "modePaiement": "ESPECES",
    "recuPath": "uploads/receipts/recu-1.pdf"
  }
}
```

---

### 10. Récupérer tous les paiements
- **Méthode**: `GET`
- **URL**: `/finance/paiements`
- **Permissions requises**: `FINANCE_VIEW`
- **Paramètres de requête**:
  - `page` (optionnel): Numéro de page (défaut: 1)
  - `limit` (optionnel): Nombre d'éléments par page (défaut: 15)

#### Réponse (200)
```json
{
  "message": "Liste des paiements récupérée avec succès",
  "data": {
    "items": [
      {
        "id": 1,
        "reference": "PAY-2026-0001",
        "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
        "facture": { "id": 1, "numero": "FAC-2026-0001" },
        "montant": 250000,
        "datePaiement": "2026-06-10T00:00:00Z",
        "modePaiement": "ESPECES",
        "recuPath": "uploads/receipts/recu-1.pdf"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 15
  }
}
```

---

### 11. Générer le reçu d'un paiement
- **Méthode**: `POST`
- **URL**: `/finance/paiements/:id/generate-recu`
- **Permissions requises**: `FINANCE_MANAGE`
- **Paramètres d'URL**:
  - `id`: ID du paiement

#### Réponse (200)
```json
{
  "message": "Reçu généré avec succès",
  "data": {
    "id": 1,
    "reference": "PAY-2026-0001",
    "recuPath": "uploads/receipts/recu-1.pdf"
  }
}
```

---

### 12. Télécharger le reçu d'un paiement
- **Méthode**: `GET`
- **URL**: `/finance/paiements/:id/recu`
- **Rôles autorisés**: `PARENT`, `ETUDIANT`
- **Permissions requises**: `FINANCE_VIEW`
- **Paramètres d'URL**:
  - `id`: ID du paiement

#### Réponse
Fichier PDF téléchargeable

---

### 13. Uploader un reçu manuel
- **Méthode**: `POST`
- **URL**: `/finance/paiements/:id/recu/upload`
- **Permissions requises**: `FINANCE_MANAGE`
- **Content-Type**: `multipart/form-data`
- **Paramètres d'URL**:
  - `id`: ID du paiement
- **Champs form-data**:
  - `file`: Fichier de reçu (PDF)

#### Réponse (200)
```json
{
  "message": "Reçu uploadé avec succès",
  "data": {
    "id": 1,
    "reference": "PAY-2026-0001",
    "recuPath": "uploads/receipts/manual-recu-789012.pdf"
  }
}
```

---

## Rapports & Dashboard

### 14. Tableau de bord financier
- **Méthode**: `GET`
- **URL**: `/finance/dashboard`
- **Permissions requises**: `FINANCE_REPORT`

#### Réponse (200)
```json
{
  "message": "Dashboard récupéré avec succès",
  "data": {
    "totalCollected": 750000,
    "totalInvoiced": 1000000,
    "totalPending": 250000,
    "monthCollected": 250000,
    "countFactures": 2,
    "countPaiements": 3,
    "statsByNiveau": {
      "L1": {
        "invoiced": 1000000,
        "collected": 750000,
        "pending": 250000
      }
    }
  }
}
```

---

### 15. Rapport financier
- **Méthode**: `GET`
- **URL**: `/finance/report`
- **Permissions requises**: `FINANCE_REPORT`
- **Paramètres de requête**:
  - `start` (optionnel): Date de début (YYYY-MM-DD)
  - `end` (optionnel): Date de fin (YYYY-MM-DD)

#### Réponse (200)
```json
{
  "message": "Rapport financier généré avec succès",
  "data": {
    "period": { "start": "2026-06-01", "end": "2026-06-30" },
    "totalCollected": 750000,
    "count": 3,
    "data": [
      {
        "id": 1,
        "reference": "PAY-2026-0001",
        "etudiant": { "id": 1, "firstName": "Paul", "lastName": "Martin" },
        "facture": { "id": 1, "numero": "FAC-2026-0001" },
        "montant": 250000,
        "datePaiement": "2026-06-10T00:00:00Z",
        "modePaiement": "ESPECES",
        "recuPath": "uploads/receipts/recu-1.pdf"
      }
    ]
  }
}
```

---

### 16. Factures impayées ou partiellement payées
- **Méthode**: `GET`
- **URL**: `/finance/unpaid`
- **Permissions requises**: `FINANCE_VIEW`
- **Paramètres de requête**:
  - `classeId` (optionnel): Filtrer par classe
  - `niveauId` (optionnel): Filtrer par niveau

#### Réponse (200)
```json
{
  "message": "Liste des impayés récupérée avec succès",
  "data": [
    {
      "id": 1,
      "numero": "FAC-2026-0001",
      "etudiant": {
        "id": 1,
        "firstName": "Paul",
        "lastName": "Martin",
        "classe": { "id": 1, "name": "Classe A" },
        "niveau": { "id": 1, "name": "L1" }
      },
      "dateEmission": "2026-06-08T00:00:00Z",
      "dateEcheance": "2026-07-08T00:00:00Z",
      "montantTotal": 500000,
      "status": "PARTIEL",
      "paiements": [
        {
          "id": 1,
          "montant": 250000
        }
      ]
    }
  ]
}
```
