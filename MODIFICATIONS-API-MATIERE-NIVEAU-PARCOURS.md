# Modifications API pour Matière, Niveau et Parcours

## 1. Endpoint Matière - Ajout des filtres par niveau, parcours et établissement

### Modification à apporter dans `matiere.controller.ts`

Ajouter les paramètres de filtrage au endpoint `GET /matiere`:

```typescript
@Get()
@Permissions('ACADEMIC_VIEW')
@ApiOperation({
  summary: 'Lister toutes les matières',
  description: 'Récupère la liste complète des matières enregistrées dans le système avec filtres optionnels.',
})
async findAll(
  @Query() paginationQuery: PaginationQueryDto,
  @Query('niveauId') niveauId?: string,
  @Query('parcoursId') parcoursId?: string, // Note: s'assurer de l'existence du modèle Parcours
  @Query('etablissementId') etablissementId?: string
) {
  const data = await this.matiereService.findAll(
    paginationQuery,
    niveauId ? +niveauId : undefined,
    parcoursId ? +parcoursId : undefined,
    etablissementId ? +etablissementId : undefined
  );
  return {
    message: 'Liste des matières récupérée avec succès',
    data,
  };
}
```

### Modification à apporter dans `matiere.service.ts`

Mettre à jour la méthode `findAll` pour accepter les filtres:

```typescript
async findAll(
  paginationQuery: PaginationQueryDto,
  niveauId?: number,
  parcoursId?: number,
  etablissementId?: number
) {
  const { page = 1, limit = 15, search } = paginationQuery;
  const skip = (page - 1) * limit;
  const tenantId = TenantContext.getTenantId();

  const queryBuilder = this.matiereRepository
    .createQueryBuilder('matiere')
    .leftJoinAndSelect('matiere.classes', 'classes')
    .leftJoinAndSelect('matiere.niveaux', 'niveaux')
    .leftJoinAndSelect('classes.etablissements', 'etablissements');

  // Filtre par search
  if (search) {
    queryBuilder.andWhere(
      '(matiere.name ILIKE :search OR matiere.code ILIKE :search)',
      { search: `%${search}%` }
    );
  }

  // Filtre par niveau
  if (niveauId) {
    queryBuilder.andWhere('niveaux.id = :niveauId', { niveauId });
  }

  // Filtre par parcours (si le modèle existe)
  if (parcoursId) {
    // queryBuilder.andWhere('parcours.id = :parcoursId', { parcoursId });
  }

  // Filtre par établissement
  if (etablissementId) {
    queryBuilder.andWhere('etablissements.id = :etablissementId', { etablissementId });
  }

  // Tenant filter
  if (tenantId) {
    queryBuilder.andWhere('etablissements.id = :tenantId', { tenantId });
  }

  const [items, total] = await queryBuilder
    .orderBy('matiere.id', 'DESC')
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return {
    items,
    total,
    page,
    limit,
  };
}
```

### Exemple d'utilisation pour le frontend
```http
GET /matiere?niveauId=1&etablissementId=1
Authorization: Bearer <token>
```

---

## 2. Endpoint Niveau - Ajout du filtre par établissement

### Modification à apporter dans `niveau.controller.ts`

Ajouter le paramètre de filtrage au endpoint `GET /niveau`:

```typescript
@Get()
@Permissions('ACADEMIC_VIEW')
@ApiOperation({
  summary: 'Lister tous les niveaux',
  description: "Récupère la liste complète des niveaux d'étude disponibles avec filtre par établissement.",
})
async findAll(@Query('etablissementId') etablissementId?: string) {
  const data = await this.niveauService.findAll(
    etablissementId ? +etablissementId : undefined
  );
  return {
    message: 'Liste des niveaux récupérée avec succès',
    data,
  };
}
```

### Modification à apporter dans `niveau.service.ts`

Mettre à jour la méthode `findAll` pour accepter le filtre:

```typescript
async findAll(etablissementId?: number): Promise<Niveau[]> {
  const tenantId = TenantContext.getTenantId();
  
  const queryBuilder = this.niveauRepository
    .createQueryBuilder('niveau')
    .leftJoinAndSelect('niveau.classes', 'classes')
    .leftJoinAndSelect('classes.etablissements', 'etablissements');

  // Filtre par établissement
  if (etablissementId) {
    queryBuilder.andWhere('etablissements.id = :etablissementId', { etablissementId });
  }

  // Tenant filter
  if (tenantId) {
    queryBuilder.andWhere('etablissements.id = :tenantId', { tenantId });
  }

  return await queryBuilder.getMany();
}
```

### Exemple d'utilisation pour le frontend
```http
GET /niveau?etablissementId=1
Authorization: Bearer <token>
```

---

## 3. Endpoint Parcours - Ajout du filtre par niveau

Si le modèle `Parcours` n'existe pas encore, il faudra le créer avec les relations appropriées. Voici un exemple de structure:

### Exemple d'entité Parcours
```typescript
// src/parcours/entities/parcours.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Niveau } from '../../niveau/entities/niveau.entity';

@Entity()
export class Parcours {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: true })
  code!: string;

  @ManyToMany(() => Niveau, (niveau) => niveau.parcours)
  niveaux!: Niveau[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### Exemple de controller pour Parcours
```typescript
// src/parcours/parcours.controller.ts
@Get()
@Permissions('ACADEMIC_VIEW')
@ApiOperation({
  summary: 'Lister tous les parcours',
  description: 'Récupère la liste complète des parcours avec filtre par niveau.',
})
async findAll(@Query('niveauId') niveauId?: string) {
  const data = await this.parcoursService.findAll(
    niveauId ? +niveauId : undefined
  );
  return {
    message: 'Liste des parcours récupérée avec succès',
    data,
  };
}
```

### Exemple de service pour Parcours
```typescript
// src/parcours/parcours.service.ts
async findAll(niveauId?: number): Promise<Parcours[]> {
  const queryBuilder = this.parcoursRepository
    .createQueryBuilder('parcours')
    .leftJoinAndSelect('parcours.niveaux', 'niveaux');

  if (niveauId) {
    queryBuilder.andWhere('niveaux.id = :niveauId', { niveauId });
  }

  return await queryBuilder.getMany();
}
```

### Exemple d'utilisation pour le frontend
```http
GET /parcours?niveauId=1
Authorization: Bearer <token>
```

---

## Résumé des endpoints mis à jour

| Module | Endpoint | Nouveaux paramètres |
|--------|----------|---------------------|
| Matière | `GET /matiere` | `niveauId`, `parcoursId`, `etablissementId` |
| Niveau | `GET /niveau` | `etablissementId` |
| Parcours | `GET /parcours` | `niveauId` |
