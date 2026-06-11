import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Paiement } from './paiement.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum InvoiceStatus {
  BROUILLON = 'Brouillon',
  VALIDE = 'Validée',
  PARTIEL = 'Partiellement Payée',
  PAYE = 'Payée',
  ANNULE = 'Annulée',
}

@Entity()
export class Facture {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty()
  numero!: string;

  @ManyToOne(() => Etudiant, { nullable: false, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @Column({ type: 'date' })
  @ApiProperty()
  dateEmission!: Date;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ required: false })
  dateEcheance?: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  montantTotal!: number;

  @Column({
    type: 'varchar',
    default: InvoiceStatus.BROUILLON,
  })
  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @OneToMany(() => Paiement, (paiement) => paiement.facture)
  @ApiProperty({ type: () => [Paiement] })
  paiements!: Paiement[];

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ required: false })
  notes?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Chemin vers le PDF de la quittance finale' })
  quittancePath?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
