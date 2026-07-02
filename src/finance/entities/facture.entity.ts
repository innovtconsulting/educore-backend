import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Paiement } from './paiement.entity';
import { Frais } from './frais.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum InvoiceStatus {
  VALIDE = 'Validée',
  PARTIEL = 'Partiellement Payée',
  PAYE = 'Payée',
}

@Entity()
@Unique(['fraisId', 'etudiantId'])
export class Facture {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty()
  numero!: string;

  @ManyToOne(() => Frais, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fraisId' })
  @ApiProperty({ type: () => Frais })
  frais!: Frais;

  @Column({ nullable: false })
  fraisId!: number;

  @ManyToOne(() => Etudiant, { nullable: false, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @Column({ nullable: false })
  etudiantId!: number;

  @Column({ type: 'date' })
  @ApiProperty()
  dateEmission!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  montantTotal!: number;

  @Column({
    type: 'varchar',
    default: InvoiceStatus.VALIDE,
  })
  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ManyToOne(() => AnneeUniversitaire, { nullable: false })
  @ApiProperty({ type: () => AnneeUniversitaire })
  anneeUniversitaire!: AnneeUniversitaire;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @OneToMany(() => Paiement, (paiement) => paiement.facture)
  @ApiProperty({ type: () => [Paiement] })
  paiements!: Paiement[];

  @ApiProperty({ required: false })
  montantPaye?: number;

  @ApiProperty({ required: false })
  montantRestant?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
