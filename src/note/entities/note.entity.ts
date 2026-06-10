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
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Evaluation } from '../../evaluation/entities/evaluation.entity';

@Entity()
@Unique(['etudiant', 'evaluation'])
export class Note {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  @ApiProperty({ example: 15.5 })
  value!: number;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ required: false })
  remark?: string;

  @ManyToOne(() => Etudiant, { nullable: false, onDelete: 'CASCADE' })
  @ApiProperty({ type: () => Etudiant })
  etudiant!: Etudiant;

  @ManyToOne(() => Evaluation, (evaluation) => evaluation.notes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @ApiProperty({ type: () => Evaluation })
  evaluation!: Evaluation;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
