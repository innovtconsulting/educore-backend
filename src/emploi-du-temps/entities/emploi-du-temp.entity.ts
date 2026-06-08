import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';

@Entity()
export class EmploiDuTemp {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  endTime!: Date;

  @ManyToOne(() => Matiere, { onDelete: 'CASCADE' })
  matiere!: Matiere;

  @ManyToOne(() => Enseignant, { onDelete: 'CASCADE' })
  enseignant!: Enseignant;

  @ManyToOne(() => Etablissement, { onDelete: 'CASCADE' })
  etablissement!: Etablissement;

  @ManyToOne(() => Classe, { onDelete: 'CASCADE' })
  classe!: Classe;

  @ManyToOne(() => Niveau, { onDelete: 'CASCADE' })
  niveau!: Niveau;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
