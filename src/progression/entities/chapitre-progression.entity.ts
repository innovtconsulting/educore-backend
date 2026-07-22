import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { User } from '../../user/entities/user.entity';

// Suivi "ce chapitre du programme est terminé", partagé par (matière, niveau,
// année universitaire) — indépendant du créneau/enseignant précis : n'importe
// quel enseignant ou surveillant intervenant sur ce niveau voit et peut faire
// évoluer le même état. `chapitreId` correspond à l'id stable (uuid) assigné
// par l'extension Tiptap UniqueIdListItem à un listItem d'un orderedList dans
// Matiere.elementsConstitutifs.
@Entity()
@Unique(['matiereId', 'niveauId', 'anneeUniversitaireId', 'chapitreId'])
export class ChapitreProgression {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @ManyToOne(() => Matiere, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'matiereId' })
  matiere!: Matiere;

  @Column()
  matiereId!: number;

  @ManyToOne(() => Niveau, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'niveauId' })
  niveau!: Niveau;

  @Column()
  niveauId!: number;

  @ManyToOne(() => AnneeUniversitaire, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'anneeUniversitaireId' })
  anneeUniversitaire!: AnneeUniversitaire;

  @Column()
  anneeUniversitaireId!: number;

  @Column({ type: 'uuid' })
  @ApiProperty()
  chapitreId!: string;

  @Column({ default: false })
  @ApiProperty()
  completed!: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completedById' })
  completedBy?: User | null;

  // Typés `| null` (pas seulement `?`) car explicitement remis à null au
  // décochage (pas simplement omis) — TypeORM n'écrit une colonne à NULL en
  // base que si on lui assigne `null`, `undefined` est ignoré au save().
  // `type` explicite obligatoire ici : pour un type union (`| null`), la
  // réflexion TypeScript ne peut pas déterminer le type de colonne tout
  // seul et retombe sur "Object", que Postgres rejette.
  @Column({ type: 'int', nullable: true })
  completedById?: number | null;

  @Column({ type: 'varchar', nullable: true })
  completedByName?: string | null;

  @Column({ type: 'varchar', nullable: true })
  completedByRole?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column()
  etablissementId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
