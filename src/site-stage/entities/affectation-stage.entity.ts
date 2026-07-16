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
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { SiteStage } from './site-stage.entity';
import { PeriodeStage } from './periode-stage.entity';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { NatureStage } from './nature-stage.entity';

export enum StageStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  ACTIF = 'ACTIF',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
}

@Entity()
@Unique(['etudiant', 'periodeStage'])
export class AffectationStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Etudiant, { nullable: false })
  @JoinColumn({ name: 'etudiantId' })
  etudiant!: Etudiant;

  @Column({ nullable: false })
  etudiantId!: number;

  @ManyToOne(() => SiteStage, { nullable: false })
  @JoinColumn({ name: 'siteStageId' })
  siteStage!: SiteStage;

  @Column({ nullable: false })
  siteStageId!: number;

  @ManyToOne(() => PeriodeStage, { nullable: false })
  @JoinColumn({ name: 'periodeStageId' })
  periodeStage!: PeriodeStage;

  @Column({ nullable: false })
  periodeStageId!: number;

  @Column({ nullable: true })
  service!: string;

  @ManyToOne(() => NatureStage, { nullable: true })
  @JoinColumn({ name: 'natureStageId' })
  natureStage?: NatureStage;

  @Column({ nullable: true })
  natureStageId?: number;

  @ManyToOne(() => Enseignant, { nullable: true })
  @JoinColumn({ name: 'enseignantId' })
  enseignant?: Enseignant;

  @Column({ nullable: true })
  enseignantId?: number;

  @Column({
    type: 'varchar',
    default: StageStatus.EN_ATTENTE,
  })
  statut!: StageStatus;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  dateAffectation!: Date;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
