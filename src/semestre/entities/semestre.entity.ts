import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Evaluation } from '../../evaluation/entities/evaluation.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';

@Entity()
export class Semestre {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column()
  @ApiProperty({ example: 'Semestre 1' })
  name!: string;

  @ManyToOne(() => AnneeUniversitaire, (annee) => annee.semestres, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @ApiProperty({ type: () => AnneeUniversitaire })
  anneeUniversitaire!: AnneeUniversitaire;

  @Column({ type: 'date' })
  @ApiProperty()
  startDate!: Date;

  @Column({ type: 'date' })
  @ApiProperty()
  endDate!: Date;

  @Column({ default: true })
  @ApiProperty()
  isActive!: boolean;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.semestre)
  evaluations!: Evaluation[];

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
