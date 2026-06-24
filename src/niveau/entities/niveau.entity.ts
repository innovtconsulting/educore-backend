import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { Matiere } from '../../matiere/entities/matiere.entity';

@Entity()
export class Niveau {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @ManyToOne(() => Classe, (classe) => classe.niveaux, { nullable: false })
  classe!: Classe;

  @OneToMany(() => Matiere, (matiere) => matiere.niveau)
  matieres!: Matiere[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
