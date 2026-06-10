import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Semestre } from '../../semestre/entities/semestre.entity';
import { Note } from '../../note/entities/note.entity';

export enum EvaluationType {
  CC = 'Contrôle Continu',
  EXAMEN = 'Examen',
  PROJET = 'Projet',
}

export enum EvaluationSession {
  NORMALE = 'Normale',
  RATTRAPAGE = 'Rattrapage',
}

@Entity()
export class Evaluation {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty()
  title!: string;

  @Column({
    type: 'varchar',
    default: EvaluationType.CC,
  })
  @ApiProperty({ enum: EvaluationType })
  type!: EvaluationType;

  @Column({
    type: 'varchar',
    default: EvaluationSession.NORMALE,
  })
  @ApiProperty({ enum: EvaluationSession })
  session!: EvaluationSession;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  @ApiProperty({ description: "Coefficient de l'évaluation dans la matière" })
  weight!: number;

  @Column({ type: 'date' })
  @ApiProperty()
  date!: Date;

  @ManyToOne(() => Matiere, { nullable: false })
  @ApiProperty({ type: () => Matiere })
  matiere!: Matiere;

  @ManyToOne(() => Classe, { nullable: false })
  @ApiProperty({ type: () => Classe })
  classe!: Classe;

  @ManyToOne(() => Niveau, { nullable: false })
  @ApiProperty({ type: () => Niveau })
  niveau!: Niveau;

  @ManyToOne(() => Semestre, (semestre) => semestre.evaluations, {
    nullable: false,
  })
  @ApiProperty({ type: () => Semestre })
  semestre!: Semestre;

  @OneToMany(() => Note, (note) => note.evaluation)
  notes!: Note[];

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
