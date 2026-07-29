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
import { LigneStage } from './ligne-stage.entity';
import { SiteStage } from './site-stage.entity';
import { NatureStage } from './nature-stage.entity';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';

export enum StageStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  ACTIF = 'ACTIF',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
}

/**
 * Un créneau (1 à 5 par ligne) : ses dates, son site, sa nature et son
 * tuteur sont propres à la ligne — ils ne changent pas quand l'étudiant
 * assigné à la ligne change.
 */
@Entity()
@Unique(['ligneStageId', 'ordre'])
export class LigneStageSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => LigneStage, (ligne) => ligne.slots, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ligneStageId' })
  ligneStage!: LigneStage;

  @Column({ nullable: false })
  ligneStageId!: number;

  @Column({ type: 'int' })
  ordre!: number;

  @Column({ nullable: false })
  libelle!: string;

  @Column({ type: 'date', nullable: true })
  dateDebut?: Date | null;

  @Column({ type: 'date', nullable: true })
  dateFin?: Date | null;

  @ManyToOne(() => SiteStage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'siteStageId' })
  siteStage?: SiteStage | null;

  @Column({ nullable: true })
  siteStageId?: number | null;

  @ManyToOne(() => NatureStage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'natureStageId' })
  natureStage?: NatureStage | null;

  @Column({ nullable: true })
  natureStageId?: number | null;

  @Column({ nullable: true })
  service?: string;

  @ManyToOne(() => Enseignant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enseignantId' })
  enseignant?: Enseignant | null;

  @Column({ nullable: true })
  enseignantId?: number | null;

  @Column({
    type: 'varchar',
    default: StageStatus.EN_ATTENTE,
  })
  statut!: StageStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
