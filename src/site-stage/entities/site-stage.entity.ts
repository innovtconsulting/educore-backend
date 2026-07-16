import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NatureStage } from './nature-stage.entity';

@Entity()
export class SiteStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  nom!: string;

  @Column({ nullable: true })
  adresse!: string;

  @Column({ nullable: true })
  telephone!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  responsable!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ nullable: true })
  capacite!: number;

  @ManyToMany(() => NatureStage, { eager: true })
  @JoinTable()
  natures!: NatureStage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
