import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Parent } from '../../parent/entities/parent.entity';

export enum EnrollmentStatus {
  ACTIF = 'Actif',
  REFUSE = 'Refusé',
  EN_ATTENTE = 'En Attente',
  SUSPENDU = 'Suspendu',
  RENVOYE = 'Renvoyé',
  DIPLOME = 'Diplomé',
}

@Entity()
export class Etudiant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  matricule!: string;

  @Column()
  lastName!: string;

  @Column()
  firstName!: string;

  @Column({ type: 'date', nullable: true })
  birthDate!: Date;

  @Column({ nullable: true })
  birthPlace!: string;

  @Column({ nullable: true })
  gender!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column({ type: 'text', nullable: true })
  address!: string;

  @Column({ nullable: true })
  nationality!: string;

  @Column({ nullable: true })
  photoPath!: string;

  @Column({ nullable: true })
  cin!: string;

  @Column({ type: 'date', nullable: true })
  cinDeliveryDate!: Date;

  @Column({ nullable: true })
  cinDeliveryPlace!: string;

  // Documents fournis (Checklist)
  @Column({ default: false })
  baccDiploma!: boolean;

  @Column({ default: false })
  residenceCertificate!: boolean;

  @Column({ default: false })
  birthCertificate!: boolean;

  @Column({ default: false })
  cinCopy!: boolean;

  @Column({ default: false })
  identityPhoto!: boolean;

  @Column({ default: false })
  transfertFile!: boolean;

  @Column({ default: false })
  cartonChemise!: boolean;

  @Column({ default: false })
  enveloppe!: boolean;

  @Column({ default: false })
  gant!: boolean;

  @Column({ default: false })
  alcohol!: boolean;

  // Statut et Relations
  @Column({
    type: 'varchar',
    default: EnrollmentStatus.ACTIF,
  })
  status!: EnrollmentStatus;

  @ManyToOne(() => Etablissement, { nullable: false })
  etablissement!: Etablissement;

  @ManyToOne(() => Classe, { nullable: false })
  classe!: Classe;

  @ManyToOne(() => Niveau, { nullable: false })
  niveau!: Niveau;

  @ManyToMany(() => Parent, (parent) => parent.etudiants)
  @JoinTable()
  parents!: Parent[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
