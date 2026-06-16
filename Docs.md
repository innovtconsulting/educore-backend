# 📘 Documentation des Fonctionnalités - Backend ESPM

Ce document présente une vue d'ensemble exhaustive des capacités du système de gestion universitaire ESPM.

## 1. 🔐 Authentification & Sécurité
*   **Gestion des Comptes :** Flux d'activation différencié selon le rôle :
    *   **Étudiants & Enseignants :** Activation par **matricule**.
    *   **Parents :** Activation par **numéro de téléphone** (identifiant principal).
    *   **Admins, Comptables, Surveillants :** Activation par **ID utilisateur**.
*   **Authentification :** Sécurisée par JWT (JSON Web Tokens). L'identifiant peut être un email ou un téléphone (parents).
*   **Rôles & Permissions :** Contrôle d'accès granulaire (RBAC) selon le type d'utilisateur (SuperAdmin, Admin, Comptable, Surveillant, Enseignant, Étudiant, Parent).
*   **Profils :** Consultation et mise à jour des informations personnelles avec synchronisation automatique entre le compte utilisateur et le profil métier.
*   **Photos de Profil :** Système d'upload centralisé pour les avatars.
*   **Récupération :** Flux complet d'oubli et de réinitialisation de mot de passe par jetons temporaires à usage unique.

## 2. 🏢 Architecture Multi-tenant
Le système implémente une isolation stricte des données pour garantir la confidentialité entre les établissements :
*   **Isolation par Tenant :** Chaque établissement (tenant) possède son propre espace de données.
*   **Contexte de Requête :** Utilisation d'un `TenantInterceptor` et de `AsyncLocalStorage` pour propager l'ID de l'établissement tout au long du traitement d'une requête.
*   **Filtrage Automatique :** Les ressources sensibles (Étudiants, Factures, Emplois du Temps, etc.) sont systématiquement filtrées par `etablissementId`.
*   **Ressources Partagées :** Certaines ressources académiques (Années Universitaires, Classes, Niveaux) peuvent être partagées ou transverses, mais l'accès reste contrôlé par le contexte du tenant.
*   **Vue Transverse :** Le rôle `SuperAdmin` bénéficie d'une visibilité totale sur l'ensemble des tenants pour la gestion globale.

## 3. 🏛️ Structure Académique
*   **Multi-Établissements :** Gestion de plusieurs sites ou entités au sein d'une même instance.
*   **Niveaux & Classes :** Organisation hiérarchique des cursus (ex: Licence 1 Informatique). Une classe peut être rattachée à plusieurs établissements.
*   **Matières :** Catalogue des unités d'enseignement avec codes uniques et coefficients pour le calcul des moyennes.
*   **Affectations :** Liaison dynamique entre Enseignants, Matières, Niveaux et Établissements via l'entité `Affectation`.

## 3. 📅 Gestion Pédagogique (LMD)
*   **Années Universitaires :** Définition des périodes académiques (ex: 2025-2026). Gestion **globale** centralisée par le SuperAdmin.
*   **Semestres :** Découpage temporel de l'année (S1, S2). Configuration restreinte au SuperAdmin pour garantir la cohérence du cursus.
*   **Emploi du Temps :**
    *   Planification des cours par matière, classe et enseignant.
    *   **Détection de conflits :** Vérification automatique de la disponibilité des salles/classes et des enseignants.
    *   Validation des affectations avant programmation.
*   **Devoirs :** Gestion des travaux à rendre avec dates limites.

## 4. 📝 Évaluations & Notes
*   **Types d'Évaluations :** Support des Contrôles Continus (CC), Examens et Projets.
*   **Système LMD :**
    *   Calcul automatique des moyennes par matière (pondérée).
    *   Calcul de la Moyenne Générale Semestrielle.
    *   **Gestion des Rattrapages :** Remplacement intelligent de la note d'examen par la note de rattrapage.
    *   **Règles de passage :** Gestion des notes éliminatoires (≤ 4/20) et conditions d'admission (Moyenne ≥ 10/20).
*   **Bulletins :** Génération de synthèses de notes par semestre.

## 5. 💰 Gestion Financière
*   **Configuration des Frais :** Paramétrage des montants par classe et par niveau (Scolarité, Inscription, etc.).
*   **Facturation :** Émission de factures aux étudiants avec suivi des statuts (Brouillon, Validée, Payée, etc.).
*   **Paiements :** Enregistrement des règlements et mise à jour automatique des soldes.
*   **Automatisation de Documents :**
    *   Génération automatique de **Reçus de Paiement**.
    *   Génération automatique de **Quittance de Solde** une fois la facture intégralement payée.

## 6. 🏃 Vie Scolaire & Discipline
*   **Présence :** Suivi rigoureux des absences et des retards pour chaque séance de cours.
*   **Sanctions :** Gestion du dossier disciplinaire (Avertissement, Blâme, Exclusion, etc.) rattaché à l'étudiant.
*   **Règlement Intérieur :** Centralisation des textes réglementaires et consignes de l'établissement.
*   **Rapports Quotidiens :** Saisie et archivage des rapports de vacation par les surveillants.

## 7. 📊 Tableaux de Bord & Reporting
*   **Dashboard Étudiant :** Vue 360° (Notes, absences, devoirs, état financier, emploi du temps du jour).
*   **Dashboard Vie Scolaire :** Monitoring des incidents et de l'assiduité.
*   **Reporting Financier :**
    *   Métriques globales (Total facturé, encaissé, impayés).
    *   Ventilation précise par Niveau d'étude.
    *   Suivi dynamique des relances pour factures en souffrance.

## 8. 📂 Outils Transverses
*   **GED (Gestion Électronique de Documents) :**
    *   Stockage sécurisé de fichiers (Administratif, Pédagogique, Règlements).
    *   Gestion du cycle de vie des documents (upload/suppression physique).
*   **Service Mail :** Moteur d'envoi de notifications (notifications de compte, réinitialisation de mot de passe).
*   **Pagination Globale :** Standardisation de la navigation dans les grands volumes de données (20 items par défaut).
*   **Documentation API :** Interface Swagger auto-générée pour faciliter l'intégration frontend.

## 9. ⚙️ Configuration Globale (SuperAdmin)
*   **Panneau de Contrôle :** Interface centralisée permettant de modifier le comportement de toute la plateforme sans déploiement.
*   **Paramètres Académiques :** Définition globale des moyennes de passage et des seuils de notes éliminatoires.
*   **Gestion des Flux :** Activation/Désactivation de l'auto-inscription publique des étudiants et enseignants.
*   **Paramètres Financiers :** Gestion de la devise par défaut et des éventuelles pénalités de retard.
*   **Système & Sécurité :** Mode maintenance, limites de taille d'upload et configuration des expéditeurs d'emails.
