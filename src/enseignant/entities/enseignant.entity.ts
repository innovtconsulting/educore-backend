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

  // Documents fournis (Checklist)
  @Column({ default: false })
  ficheProf!: boolean;

  @Column({ default: false })
  cv!: boolean;

  @Column({ default: false })
  photocopieDiplome!: boolean;

  @Column({ default: false })
  photocopieCin!: boolean;

  @Column({ default: false })
  contratConsultance!: boolean;

  @Column({ default: false })
  lettreMotivation!: boolean;

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
