import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';

export enum SanctionType {
  AVERTISSEMENT_VERBALE = 'Avertissement verbale',
  RECUPERATION = 'Récupération',
  CONVOCATION_PARENT = 'Convocation de parent',
  AVERTISSEMENT = 'Avertissement',
  CONSEIL_DISCIPLINE = 'Conseil de discipline',
  EXCLUSION_TEMPORAIRE = 'Exclusion temporaire',
  EXCLUSION_DEFINITIVE = 'Exclusion definitive',
}

@Entity()
export class Sanction {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @ManyToOne(() => Etudiant, { nullable: false, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @Column({
    type: 'varchar',
    default: SanctionType.AVERTISSEMENT,
  })
  @ApiProperty({ enum: SanctionType })
  type!: SanctionType;

  @Column({ type: 'text' })
  @ApiProperty()
  motif!: string;

  @Column({ type: 'date' })
  @ApiProperty()
  dateDecision!: Date;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ required: false })
  dateDebut?: Date;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ required: false })
  dateFin?: Date;

  @Column({ default: true })
  @ApiProperty()
  isApplied!: boolean;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  // nullable en base pour ne pas casser la synchro TypeORM sur les sanctions déjà existantes ;
  // toujours renseignée par SanctionService.create() avec l'année universitaire active
  @ManyToOne(() => AnneeUniversitaire, { nullable: true })
  @JoinColumn({ name: 'anneeUniversitaireId' })
  @ApiProperty({ type: () => AnneeUniversitaire, required: false })
  anneeUniversitaire?: AnneeUniversitaire;

  @Column({ nullable: true })
  anneeUniversitaireId?: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
