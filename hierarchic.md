# Mission : Vérifier et compléter le filtrage hiérarchique Parcours → Niveau → Matière

## Contexte du domaine

La hiérarchie métier est la suivante :
Établissement → Parcours (= "classe") → Niveau → Matière

C'est-à-dire :
- Un Parcours appartient à un Établissement
- Un Parcours a plusieurs Niveaux
- Un Niveau appartient à un seul Parcours
- Un Niveau a plusieurs Matières
- Une Matière appartient à un seul Niveau

## Phase 1 — AUDIT du modèle de données (obligatoire avant tout code)

Analyse les entités TypeORM concernées (Etablissement, Parcours, Niveau, Matiere) et
réponds précisément aux questions suivantes :

1. **Relations déclarées**
   - Niveau possède-t-il bien une relation (`@ManyToOne`) vers Parcours, avec une colonne
     FK correspondante (ex: `parcoursId`) ?
   - Matiere possède-t-il bien une relation (`@ManyToOne`) vers Niveau, avec une colonne
     FK correspondante (ex: `niveauId`) ?
   - Parcours possède-t-il bien une relation vers Etablissement ?
   - Pour chaque relation, vérifie aussi la présence (ou l'absence) de la relation inverse
     (`@OneToMany`) du côté parent, et si elle est utilisée quelque part.

2. **Cohérence base de données**
   - Vérifie que les migrations / le schéma réel correspondent à ce que déclarent les
     entités (colonnes FK, contraintes de clé étrangère présentes en DB, pas seulement
     dans le code TypeORM).
   - Signale toute incohérence entre entité et schéma (ex: colonne manquante, FK non
     contrainte, nullable alors qu'elle ne devrait pas l'être, etc.).

3. **Endpoints et DTO actuels**
   - Pour chaque endpoint de retrieve sur Matiere (findAll, search, pagination...), liste
     les query params / filtres actuellement supportés.
   - Idem pour Niveau (peut-on filtrer par `parcoursId` ?).
   - Identifie précisément pourquoi on ne peut pas aujourd'hui faire une requête du type
     "matières du niveau X qui appartient au parcours Y" : est-ce que c'est parce que
     le filtre n'est pas exposé dans le controller/service, parce que la relation manque
     en base, ou les deux ?

4. **Cas d'incohérence de données existantes**
   - S'il y a déjà des données en base, vérifie s'il existe des Niveaux sans `parcoursId`
     valide, ou des Matières sans `niveauId` valide (orphelins), qui empêcheraient un
     filtrage strict une fois les contraintes ajoutées.

Présente un rapport clair : pour chaque relation attendue (Parcours→Etablissement,
Niveau→Parcours, Matiere→Niveau), dis explicitement si elle existe et fonctionne, si elle
existe mais est mal exploitée, ou si elle n'existe pas du tout.

## Phase 2 — IMPLÉMENTATION (uniquement si l'audit révèle un manque)

En fonction des résultats de l'audit, applique les correctifs nécessaires :

1. **Si une relation/FK manque en entité ou en base**
   - Ajoute la relation TypeORM (`@ManyToOne`/`@OneToMany`) et la colonne FK.
   - Génère la migration TypeORM correspondante (ne pas utiliser `synchronize: true`).
   - Gère le cas des données orphelines existantes (proposer une stratégie avant
     d'appliquer une contrainte stricte qui casserait sur ces lignes : faut-il les
     rattacher, les supprimer, ou les ignorer ? Demande-moi si ambigu).

2. **Filtrage combiné sur les endpoints de retrieve**
   - Sur l'endpoint de listing des Matières : permettre de filtrer par `niveauId`
     ET/OU par `parcoursId` (même si `parcoursId` n'est pas une colonne directe de
     Matiere, filtrer via la relation Niveau → Parcours).
   - Sur l'endpoint de listing des Niveaux : permettre de filtrer par `parcoursId`.
   - Utiliser le DTO de query existant (ou en créer un) avec validation
     (`class-validator`) plutôt que des query params non typés.
   - Implémenter le filtrage via QueryBuilder ou `relations` + `where` TypeORM,
     pas de requête SQL brute.

3. **Cohérence avec le filtrage multi-tenant (établissement)**
   - Si la migration JWT/établissement évoquée précédemment est déjà en place ou en
     cours, s'assurer que ce nouveau filtrage hiérarchique (parcours/niveau) reste
     bien imbriqué DANS le scope établissement (un utilisateur ne doit jamais pouvoir
     filtrer par `parcoursId` appartenant à un autre établissement).

## Contraintes générales
- Ne fais aucune modification de schéma sans me présenter d'abord le résultat de l'audit
  de la Phase 1.
- Si l'audit révèle que tout est déjà correctement modélisé et que seul le filtre au
  niveau controller/service manque, ne touche pas au schéma — implémente uniquement
  la Phase 2 point 2.
- Respecte les conventions de nommage et l'architecture déjà en place dans le projet.