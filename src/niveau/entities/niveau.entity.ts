import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Niveau {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @ManyToOne(() => Classe, (classe) => classe.niveaux, { nullable: false })
  classe!: Classe;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @ManyToMany(() => Matiere, (matiere) => matiere.niveaux)
  matieres!: Matiere[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
