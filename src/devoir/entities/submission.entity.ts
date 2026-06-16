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
import { Devoir } from './devoir.entity';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Document } from '../../document/entities/document.entity';

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

  @CreateDateColumn()
  @ApiProperty()
  submittedAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
