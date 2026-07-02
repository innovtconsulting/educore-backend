import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class PeriodeStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  libelle!: string;

  @Column({ type: 'date', nullable: false })
  dateDebut!: Date;

  @Column({ type: 'date', nullable: false })
  dateFin!: Date;

  @ManyToOne(() => AnneeUniversitaire, { nullable: false })
  @JoinColumn({ name: 'anneeUniversitaireId' })
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
