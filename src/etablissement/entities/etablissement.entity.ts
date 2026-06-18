import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';

@Entity()
export class Etablissement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: true, unique: true, length: 50 })
  acronyme!: string;

  @Column({ nullable: false, length: 50 })
  address!: string;

  @Column({ nullable: false, unique: true })
  email!: string;

  @Column({ nullable: true, length: 20 })
  phone!: string;

  @ManyToMany(() => Classe, (classe) => classe.etablissements)
  classes!: Classe[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
