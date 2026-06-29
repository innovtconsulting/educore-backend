import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

export enum FeeType {
  INSCRIPTION = 'Inscription',
  SCOLARITE = 'Scolarité',
  EXAMEN = 'Examen',
  UNIFORME = 'Uniforme',
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

  @ManyToOne(() => Classe, { nullable: true, onDelete: 'SET NULL' })
  @ApiProperty({ type: () => Classe, required: false })
  classe?: Classe;

  @ManyToOne(() => Niveau, { nullable: true, onDelete: 'SET NULL' })
  @ApiProperty({ type: () => Niveau, required: false })
  niveau?: Niveau;

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
