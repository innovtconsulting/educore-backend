import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Niveau } from '../../niveau/entities/niveau.entity';

@Entity()
export class Matiere {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false, unique: true })
  code!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  coefficient!: number;

  @ManyToOne(() => Niveau, (niveau) => niveau.matieres, { nullable: false })
  niveau!: Niveau;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
