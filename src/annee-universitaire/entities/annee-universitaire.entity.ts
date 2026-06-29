import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Semestre } from '../../semestre/entities/semestre.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

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

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @OneToMany(() => Semestre, (semestre) => semestre.anneeUniversitaire)
  semestres!: Semestre[];

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;
}
