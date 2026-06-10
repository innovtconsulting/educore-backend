import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Semestre } from '../../semestre/entities/semestre.entity';

@Entity()
export class AnneeUniversitaire {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id!: number;

  @Column({ unique: true })
  @ApiProperty({ example: '2025-2026' })
  label!: string;

  @Column({ type: 'date' })
  @ApiProperty()
  startDate!: Date;

  @Column({ type: 'date' })
  @ApiProperty()
  endDate!: Date;

  @Column({ default: false })
  @ApiProperty()
  isActive!: boolean;

  @OneToMany(() => Semestre, (semestre) => semestre.anneeUniversitaire)
  semestres!: Semestre[];

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
