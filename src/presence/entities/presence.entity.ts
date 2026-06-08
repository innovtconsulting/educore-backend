import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { EmploiDuTemp } from '../../emploi-du-temps/entities/emploi-du-temp.entity';

export enum PresenceStatus {
  PRESENT = 'Présent',
  ABSENT = 'Absent',
  RETARD = 'Retard',
}

@Entity()
@Unique(['etudiant', 'emploiDuTemp'])
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

  @ManyToOne(() => EmploiDuTemp, { onDelete: 'CASCADE', nullable: false })
  emploiDuTemp!: EmploiDuTemp;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
