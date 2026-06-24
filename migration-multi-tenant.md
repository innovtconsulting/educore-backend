# Mission : Migrer la gestion multi-tenant (établissement) d'AsyncLocalStorage vers JWT

## Contexte du domaine

Le projet gère des établissements scolaires avec une hiérarchie de données :
Établissement → Parcours → Niveaux → Matières

Chaque établissement ne doit voir/manipuler QUE ses propres données (parcours, niveaux,
matières, et toute autre entité qui en dépend). C'est une isolation multi-tenant complète.

## Problème actuel

Le tenant (établissement) courant est géré via AsyncLocalStorage (ou un mécanisme similaire).
Cette approche est suspectée d'être :
- Incomplète (pas appliquée à tous les endpoints/repositories)
- Potentiellement non fonctionnelle dans certains cas (ex: après un changement de contexte
  async, dans des queues, des tâches planifiées, etc.)
- Pas le bon pattern pour ce besoin : l'établissement doit être déterminé à partir du JWT
  de l'utilisateur authentifié, pas via un store global type ALS.

Un système d'authentification JWT existe déjà dans le projet (NestJS + Passport probablement),
mais il ne porte PAS encore l'information d'établissement, et n'est pas utilisé pour le
scoping multi-tenant.

## Phase 1 — AUDIT (obligatoire avant tout code)

Avant de modifier quoi que ce soit, fais une analyse complète et rapporte-moi :

1. **Repérage de l'AsyncLocalStorage actuel**
   - Où est-il défini/instancié (module, provider, service) ?
   - Comment est-il rempli (quel middleware/interceptor/guard, à partir de quelle donnée :
     header, sous-domaine, query param, JWT existant, etc.) ?
   - Comment est-il consommé (liste précise des fichiers/services/repositories qui le lisent) ?
   - Est-il bien initialisé sur TOUTES les requêtes (vérifie l'ordre des middlewares,
     les routes exclues, les contextes non-HTTP comme les jobs/cron/queues) ?

2. **État du JWT actuel**
   - Quelle stratégie Passport est utilisée (JwtStrategy, etc.) ?
   - Quel est le payload actuel du JWT (quels champs) ?
   - Où le JWT est-il généré (AuthService, login endpoint) ?
   - Comment le `user` est-il actuellement injecté dans les requêtes (decorator `@CurrentUser()`,
     `req.user`, etc.) ?

3. **Cartographie des entités liées à l'établissement**
   - Liste toutes les entités (TypeORM) qui doivent être scopées par établissement :
     Etablissement, Parcours, Niveau, Matiere, et toute autre entité qui en dépend
     directement ou indirectement (relations).
   - Pour chaque entité concernée, identifie si la relation vers l'établissement est directe
     (FK directe) ou indirecte (via Parcours, via Niveau, etc.).

4. **Cartographie des endpoints concernés**
   - Liste tous les endpoints (controllers) qui font du retrieve (findAll, findOne, search,
     pagination, etc.) sur ces entités et qui devraient être filtrés par établissement mais
     ne le sont pas forcément correctement aujourd'hui.
   - Note aussi les endpoints de création/modification : ils doivent aussi être protégés
     pour empêcher de créer/modifier une ressource hors de son établissement.

Présente cet audit sous forme de rapport structuré (pas de code à ce stade). Signale
explicitement toute incohérence, dead code, ou comportement qui semble cassé dans
l'implémentation actuelle de l'ALS.

## Phase 2 — PLAN DE MIGRATION (à valider avec moi avant implémentation)

Une fois l'audit fait, propose un plan détaillé :

1. **Modification du JWT**
   - Ajouter l'`etablissementId` (et tout champ pertinent identifié en Phase 1) dans le
     payload JWT, à la génération (login).
   - Adapter la JwtStrategy pour exposer ces infos sur `req.user`.

2. **Suppression de l'AsyncLocalStorage**
   - Plan de retrait propre (provider, module, middleware concernés).
   - Remplacement de chaque point de lecture par l'extraction depuis `req.user`
     (via un decorator custom, ex: `@CurrentEtablissement()` ou équivalent).

3. **Stratégie de filtrage par établissement**
   - Proposer un mécanisme réutilisable et centralisé (pas du copier-coller de `where:
     { etablissementId }` partout) — par exemple :
     - Un decorator de paramètre pour récupérer l'établissement courant depuis le JWT.
     - Un Guard qui vérifie la cohérence établissement/ressource sur les actions
       create/update/delete (pas seulement le retrieve).
     - Pour les entités liées indirectement (Niveau → via Parcours → Etablissement,
       Matiere → via Niveau → via Parcours → Etablissement) : proposer soit un filtre
       via jointure TypeORM (`leftJoinAndSelect` + `where` sur la relation racine), soit
       une dénormalisation du `etablissementId` sur chaque entité (à argumenter, avec
       avantages/inconvénients des deux approches).

4. **Liste exhaustive des fichiers à modifier**, avec pour chacun une description courte
   du changement prévu.

Ne commence l'implémentation qu'après que j'ai validé ce plan.

## Contraintes générales
- Respecter l'architecture existante du projet (modules NestJS, conventions de nommage,
  patterns déjà en place).
- Ne pas casser les fonctionnalités d'authentification existantes (login, refresh token
  si présent, etc.).
- Si certains endpoints sont publics (sans JWT) ou s'il existe un rôle "super admin"
  multi-établissements, signale-le explicitement dans l'audit — cela impacte le design
  du filtre.