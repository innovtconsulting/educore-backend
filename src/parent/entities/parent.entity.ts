import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

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

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @ManyToMany(() => Etudiant, (etudiant) => etudiant.parents)
  etudiants!: Etudiant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
