import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Etablissement } from '../../etablissement/entities/etablissement.entity';
import { Classe } from '../../classe/entities/classe.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Parent } from '../../parent/entities/parent.entity';
import { Sanction } from '../../sanction/entities/sanction.entity';
import { User } from '../../user/entities/user.entity';
import { Inscription } from './inscription.entity';

export enum SerieBac {
  A = 'A',
  A1 = 'A1',
  A2 = 'A2',
  C = 'C',
  D = 'D',
  OSE = 'OSe',
}

export enum EnrollmentStatus {
  ACTIF = 'Actif',
  INACTIF = 'Inactif',
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

  @OneToOne(() => User, (user) => user.etudiant)
  user?: User;

  @Column({ unique: true, nullable: true })
  matricule?: string;

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

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column('simple-array', { nullable: true })
  telephonesSupplementaires!: string[];

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

  @Column({ type: 'varchar', nullable: true })
  serieBac?: SerieBac;

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
  releveNotes!: boolean;

  @Column({ default: false })
  cartonChemise!: boolean;

  @Column({ default: false })
  enveloppe!: boolean;

  @Column({ default: false })
  gant!: boolean;

  @Column({ default: false })
  alcohol!: boolean;

  @AfterLoad()
  computeDossierStatus() {
    const docs = [
      this.baccDiploma,
      this.residenceCertificate,
      this.birthCertificate,
      this.cinCopy,
      this.identityPhoto,
      this.transfertFile,
      this.releveNotes,
      this.cartonChemise,
      this.enveloppe,
      this.gant,
      this.alcohol,
    ];
    this.dossierStatus = docs.every(Boolean) ? 'Complet' : 'Incomplet';
  }

  dossierStatus?: string;

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

  @OneToMany(() => Sanction, (sanction) => sanction.etudiant)
  sanctions!: Sanction[];

  @OneToMany(() => Inscription, (inscription) => inscription.etudiant)
  inscriptions!: Inscription[];
}
