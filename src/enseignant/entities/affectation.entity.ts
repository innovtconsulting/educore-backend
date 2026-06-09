import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Enseignant } from './enseignant.entity';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';

@Entity()
export class Affectation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Enseignant, (enseignant) => enseignant.affectations, {
    onDelete: 'CASCADE',
  })
  enseignant!: Enseignant;

  @ManyToOne(() => Matiere, { onDelete: 'CASCADE' })
  matiere!: Matiere;

  @ManyToOne(() => Etablissement, { onDelete: 'CASCADE' })
  etablissement!: Etablissement;

  @ManyToOne(() => Niveau, { onDelete: 'CASCADE' })
  niveau!: Niveau;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
