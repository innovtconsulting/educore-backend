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

export enum SanctionType {
  AVERTISSEMENT = 'Avertissement',
  BLAME = 'Blâme',
  EXCLUSION_TEMPORAIRE = 'Exclusion Temporaire',
  EXCLUSION_DEFINITIVE = 'Exclusion Définitive',
  CONSEIL_DISCIPLINE = 'Conseil de Discipline',
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

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
