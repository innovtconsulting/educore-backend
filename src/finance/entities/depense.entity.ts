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
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum DepenseCategory {
  SALAIRES = 'Salaires',
  FOURNITURES = 'Fournitures',
  ENTRETIEN = 'Entretien',
  FACTURES = 'Factures (eau, électricité, internet...)',
  AUTRE = 'Autre',
}

@Entity()
export class Depense {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({
    type: 'varchar',
    default: DepenseCategory.AUTRE,
  })
  @ApiProperty({ enum: DepenseCategory })
  category!: DepenseCategory;

  @Column({ nullable: true })
  @ApiProperty({ required: false })
  libelle?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  amount!: number;

  @Column({ type: 'date' })
  @ApiProperty()
  date!: Date;

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
