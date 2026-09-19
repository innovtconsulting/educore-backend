import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { EmploiDuTemp } from '../../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';

export enum PresenceStatus {
  PRESENT = 'Présent',
  ABSENT = 'Absent',
  RETARD = 'Retard',
}

export enum DemiJournee {
  MATIN = 'MATIN',
  APRES_MIDI = 'APRES_MIDI',
}

@Entity()
@Index(['etudiant', 'emploiDuTemp'], { unique: true, where: '"emploiDuTempId" IS NOT NULL' })
@Index(['etudiant', 'date', 'demiJournee'], { unique: true, where: '"date" IS NOT NULL AND "demiJournee" IS NOT NULL' })
export class Presence {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    default: PresenceStatus.PRESENT,
  })
  status!: PresenceStatus;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @ManyToOne(() => Etudiant, { onDelete: 'CASCADE', nullable: false })
  etudiant!: Etudiant;

  @ManyToOne(() => EmploiDuTemp, { onDelete: 'CASCADE', nullable: true })
  emploiDuTemp?: EmploiDuTemp | null;

  // ── Mode primaire (Chérubin) : demi-journée ──────────────────────────────
  @Column({ type: 'date', nullable: true })
  date?: string | null; // YYYY-MM-DD

  @Column({ type: 'enum', enum: DemiJournee, nullable: true })
  demiJournee?: DemiJournee | null;

  @ManyToOne(() => Classe, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'classeId' })
  classe?: Classe | null;

  @Column({ nullable: true })
  classeId?: number | null;

  @ManyToOne(() => Niveau, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'niveauId' })
  niveau?: Niveau | null;

  @Column({ nullable: true })
  niveauId?: number | null;

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
