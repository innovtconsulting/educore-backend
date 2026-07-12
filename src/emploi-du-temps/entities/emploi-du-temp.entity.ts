import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Salle } from '../../salle/entities/salle.entity';

export enum EmploiDuTempType {
  COURS = 'Cours',
  EVENEMENT = 'Evenement',
}

@Entity()
export class EmploiDuTemp {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', default: EmploiDuTempType.COURS })
  type!: EmploiDuTempType;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  groupeId?: string;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  endTime!: Date;

  @ManyToOne(() => Matiere, { onDelete: 'CASCADE', nullable: true })
  matiere?: Matiere;

  @ManyToOne(() => Enseignant, { onDelete: 'CASCADE', nullable: true })
  enseignant?: Enseignant;

  @ManyToOne(() => Etablissement, { onDelete: 'CASCADE' })
  etablissement!: Etablissement;

  @ManyToOne(() => Classe, { onDelete: 'CASCADE' })
  classe!: Classe;

  @ManyToOne(() => Niveau, { onDelete: 'CASCADE' })
  niveau!: Niveau;

  @ManyToOne(() => Salle, { onDelete: 'SET NULL', nullable: true })
  salle?: Salle;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
