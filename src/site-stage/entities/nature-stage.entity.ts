import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';

@Entity()
@Unique(['nom'])
export class NatureStage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false, unique: true })
  nom!: string;

  @Column({ nullable: true })
  description!: string;

  @ManyToMany(() => Classe, { eager: true })
  @JoinTable()
  classes?: Classe[];

  @ManyToMany(() => Niveau, { eager: true })
  @JoinTable()
  niveaux?: Niveau[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
