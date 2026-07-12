import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Journal } from './journal.entity';
import { User } from '../../user/entities/user.entity';

export enum JournalAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

@Entity()
export class JournalHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Journal, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'journalId' })
  journal!: Journal;

  @Column({ nullable: false })
  journalId!: number;

  @Column({ type: 'varchar' })
  action!: JournalAction;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'performedById' })
  performedBy!: User;

  @Column({ nullable: false })
  performedById!: number;

  @Column()
  performedByName!: string;

  @Column()
  performedByRole!: string;

  @Column({ type: 'json' })
  snapshot!: {
    title: string;
    content: string;
    objectives?: string;
    homework?: string;
    remarks?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;
}
