import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Facture } from './facture.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum PaymentMethod {
  ESPECES = 'Espèces',
  VIREMENT = 'Virement',
  CHEQUE = 'Chèque',
  ORANGE_MONEY = 'Orange Money',
  WAVE = 'Wave',
  AUTRE = 'Autre',
}

@Entity()
@Unique(['factureId', 'tranche'])
export class Paiement {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty()
  reference!: string;

  @ManyToOne(() => Etudiant, { nullable: false, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @ManyToOne(() => Facture, (facture) => facture.paiements, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'factureId' })
  @ApiProperty({ type: () => Facture })
  facture!: Facture;

  @Column({ nullable: false })
  factureId!: number;

  @Column({ type: 'int' })
  @ApiProperty({ description: 'Numéro de tranche (1 à 3)' })
  tranche!: number;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({
    required: false,
    description:
      'Référence commune pour les paiements groupés (permet de regrouper plusieurs paiements dans une même transaction)',
  })
  groupeReference?: string;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  montant!: number;

  @Column({ type: 'date' })
  @ApiProperty()
  datePaiement!: Date;

  @Column({
    type: 'varchar',
    default: PaymentMethod.ESPECES,
  })
  @ApiProperty({ enum: PaymentMethod })
  modePaiement!: PaymentMethod;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
