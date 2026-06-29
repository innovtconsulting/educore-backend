import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Devoir } from './devoir.entity';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Document } from '../../document/entities/document.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
@Unique(['devoir', 'etudiant'])
export class Submission {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ required: false })
  comment?: string;

  @ManyToOne(() => Devoir, { onDelete: 'CASCADE', nullable: false })
  @ApiProperty({ type: () => Devoir })
  devoir!: Devoir;

  @ManyToOne(() => Etudiant, { onDelete: 'CASCADE', nullable: false })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @ManyToOne(() => Document, { nullable: false })
  @ApiProperty({ type: () => Document })
  document!: Document;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @CreateDateColumn()
  @ApiProperty()
  submittedAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
