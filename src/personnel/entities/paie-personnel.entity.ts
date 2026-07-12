import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Personnel } from './personnel.entity';

export enum PaieType {
  AVANCE = 'Avance',
  SOLDE = 'Solde',
}

@Entity()
export class PaiePersonnel {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @ManyToOne(() => Personnel, (personnel) => personnel.paies, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'personnelId' })
  @ApiProperty({ type: () => Personnel })
  personnel!: Personnel;

  @Column({ nullable: false })
  personnelId!: number;

  @Column({ type: 'varchar' })
  @ApiProperty({ enum: PaieType })
  type!: PaieType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  montant!: number;

  @Column({ type: 'date' })
  @ApiProperty()
  datePaiement!: Date;

  @Column({ type: 'int' })
  @ApiProperty({ description: 'Mois concerné (1-12)' })
  mois!: number;

  @Column({ type: 'int' })
  @ApiProperty({ description: 'Année concernée' })
  annee!: number;

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
