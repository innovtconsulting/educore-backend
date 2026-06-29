import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Affectation } from './affectation.entity';
import { User } from '../../user/entities/user.entity';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';

@Entity()
export class Enseignant {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => User, (user) => user.enseignant)
  user?: User;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ unique: true })
  matricule!: string;

  @Column({ nullable: true })
  photoPath!: string;

  @Column({ type: 'date' })
  dateEmbauche!: Date;

  @ManyToOne(() => Etablissement, { nullable: false })
  @JoinColumn({ name: 'etablissementId' })
  etablissement!: Etablissement;

  @Column({ nullable: false })
  etablissementId!: number;

  @OneToMany(() => Affectation, (affectation) => affectation.enseignant)
  affectations!: Affectation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
