import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';

export enum FeeType {
  INSCRIPTION = 'Inscription',
  SCOLARITE = 'Scolarité',
  EXAMEN = 'Examen',
  ECOLAGE = 'Écolage',
  AUTRE = 'Autre',
}

@Entity()
export class Frais {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  name!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  amount!: number;

  @Column({
    type: 'varchar',
    default: FeeType.SCOLARITE,
  })
  @ApiProperty({ enum: FeeType })
  type!: FeeType;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({
    required: false,
    description: 'Mois concerné (1-12), obligatoire pour un frais de type "Écolage"',
  })
  mois?: number;

  @Column({ type: 'uuid' })
  @Index()
  @ApiProperty({
    description: 'Identifiant commun à toutes les lignes (classe+niveau) créées lors du même appel de création de frais',
  })
  groupeId!: string;

  @ManyToOne(() => Classe, { nullable: false })
  @ApiProperty({ type: () => Classe })
  classe!: Classe;

  @ManyToOne(() => Niveau, { nullable: false })
  @ApiProperty({ type: () => Niveau })
  niveau!: Niveau;

  @ManyToOne(() => AnneeUniversitaire, { nullable: false })
  @JoinColumn({ name: 'anneeUniversitaireId' })
  @ApiProperty({ type: () => AnneeUniversitaire })
  anneeUniversitaire!: AnneeUniversitaire;

  @Column({ nullable: false })
  anneeUniversitaireId!: number;

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
