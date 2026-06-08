import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';

export enum ParentGender {
  PERE = 'Père',
  MERE = 'Mère',
  TUTEUR = 'Tuteur',
}

@Entity()
export class Parent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({
    type: 'varchar',
  })
  gender!: ParentGender;

  @Column({ nullable: true })
  email!: string;

  @Column()
  phoneNumber!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  job!: string;

  @ManyToMany(() => Etudiant, (etudiant) => etudiant.parents)
  etudiants!: Etudiant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
