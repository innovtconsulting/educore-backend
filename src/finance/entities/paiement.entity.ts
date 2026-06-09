import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Facture } from './facture.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  ESPECES = 'Espèces',
  VIREMENT = 'Virement',
  CHEQUE = 'Chèque',
  ORANGE_MONEY = 'Orange Money',
  WAVE = 'Wave',
  AUTRE = 'Autre',
}

@Entity()
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
    nullable: true,
    onDelete: 'SET NULL',
  })
  @ApiProperty({ type: () => Facture, required: false })
  facture?: Facture;

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

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  recuPath?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
