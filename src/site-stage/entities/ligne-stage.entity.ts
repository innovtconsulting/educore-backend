import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { LigneStageSlot } from './ligne-stage-slot.entity';

/**
 * Une ligne représente un circuit de rotation de stage (jusqu'à 5 créneaux)
 * propre à un parcours + niveau + année universitaire. L'étudiant qui
 * l'occupe peut être changé à tout moment sans affecter les créneaux
 * (dates/site/service/nature), qui appartiennent à la ligne elle-même.
 */
@Entity()
@Index(['etudiantId', 'anneeUniversitaireId', 'classeId', 'niveauId'], {
  unique: true,
  where: '"etudiantId" IS NOT NULL',
})
export class LigneStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Classe, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classeId' })
  classe!: Classe;

  @Column({ nullable: false })
  classeId!: number;

  @ManyToOne(() => Niveau, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'niveauId' })
  niveau!: Niveau;

  @Column({ nullable: false })
  niveauId!: number;

  @ManyToOne(() => AnneeUniversitaire, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anneeUniversitaireId' })
  anneeUniversitaire!: AnneeUniversitaire;

  @Column({ nullable: false })
  anneeUniversitaireId!: number;

  @ManyToOne(() => Etudiant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'etudiantId' })
  etudiant?: Etudiant | null;

  @Column({ nullable: true })
  etudiantId?: number | null;

  @Column({ nullable: true })
  nomIndicatif?: string;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @OneToMany(() => LigneStageSlot, (slot) => slot.ligneStage, {
    cascade: true,
  })
  slots!: LigneStageSlot[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
