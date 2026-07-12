import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmploiDuTemp } from '../../emploi-du-temps/entities/emploi-du-temp.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Journal {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => EmploiDuTemp, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'emploiDuTempId' })
  emploiDuTemp!: EmploiDuTemp;

  @Column({ unique: true })
  emploiDuTempId!: number;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  objectives?: string;

  @Column({ type: 'text', nullable: true })
  homework?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ nullable: false })
  createdById!: number;

  @Column()
  createdByName!: string;

  @Column()
  createdByRole!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'lastModifiedById' })
  lastModifiedBy!: User;

  @Column({ nullable: false })
  lastModifiedById!: number;

  @Column()
  lastModifiedByName!: string;

  @Column()
  lastModifiedByRole!: string;

  @Column({ nullable: false })
  etablissementId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
