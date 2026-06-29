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
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Evaluation } from '../../evaluation/entities/evaluation.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

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

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
