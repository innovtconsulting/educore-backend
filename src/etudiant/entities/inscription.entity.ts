import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Etudiant } from './etudiant.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum InscriptionStatus {
  ACTIF = 'Actif',
  ABANDON = 'Abandon',
  TERMINE = 'Terminé',
}

@Entity()
@Unique(['etudiant', 'anneeUniversitaire'])
export class Inscription {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @ManyToOne(() => Etudiant, (etudiant) => etudiant.inscriptions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @ManyToOne(() => AnneeUniversitaire, { nullable: false })
  @ApiProperty({ type: () => AnneeUniversitaire })
  anneeUniversitaire!: AnneeUniversitaire;

  @ManyToOne(() => Classe, { nullable: false })
  @ApiProperty({ type: () => Classe })
  classe!: Classe;

  @ManyToOne(() => Niveau, { nullable: false })
  @ApiProperty({ type: () => Niveau })
  niveau!: Niveau;

  @ManyToOne(() => Etablissement, { nullable: false })
  @ApiProperty({ type: () => Etablissement })
  etablissement!: Etablissement;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  @ApiProperty()
  dateInscription!: Date;

  @Column({
    type: 'varchar',
    default: InscriptionStatus.ACTIF,
  })
  @ApiProperty({ enum: InscriptionStatus })
  status!: InscriptionStatus;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
