import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  JoinTable,
} from 'typeorm';
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

  @ManyToMany(() => Niveau, (niveau) => niveau.matieres)
  @JoinTable()
  niveaux!: Niveau[];

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
