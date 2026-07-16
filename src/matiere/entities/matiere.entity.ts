import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Matiere {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  code!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  coefficient!: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  hours!: number;

  @Column({ type: 'varchar', nullable: true })
  numeroUe?: string;

  @Column({ type: 'text', nullable: true })
  elementsConstitutifs?: string;

  @Column({ type: 'int', nullable: true })
  tpTd?: number;

  @Column({ type: 'int', nullable: true })
  tpe?: number;

  @Column({ type: 'int', nullable: true })
  vht?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  credits?: number;

  @ManyToOne(() => Niveau, (niveau) => niveau.matieres, { nullable: false })
  niveau!: Niveau;

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
