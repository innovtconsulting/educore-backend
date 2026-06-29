import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Classe } from '../../classe/entities/classe.entity';
import { User } from '../../user/entities/user.entity';
import { Enseignant } from '../../enseignant/entities/enseignant.entity';
import { Etudiant } from '../../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../../annee-universitaire/entities/annee-universitaire.entity';
import { Niveau } from '../../niveau/entities/niveau.entity';
import { Matiere } from '../../matiere/entities/matiere.entity';
import { Salle } from '../../salle/entities/salle.entity';
import { EmploiDuTemp } from '../../emploi-du-temps/entities/emploi-du-temp.entity';
import { Presence } from '../../presence/entities/presence.entity';
import { Sanction } from '../../sanction/entities/sanction.entity';
import { DailyReport } from '../../reporting/entities/daily-report.entity';
import { Document } from '../../document/entities/document.entity';
import { Evaluation } from '../../evaluation/entities/evaluation.entity';
import { Note } from '../../note/entities/note.entity';
import { Devoir } from '../../devoir/entities/devoir.entity';
import { Submission } from '../../devoir/entities/submission.entity';
import { Inscription } from '../../etudiant/entities/inscription.entity';
import { Frais } from '../../finance/entities/frais.entity';
import { Facture } from '../../finance/entities/facture.entity';
import { Paiement } from '../../finance/entities/paiement.entity';
import { Discipline } from '../../discipline/entities/discipline.entity';
import { GeneratedDocument } from '../../certificate/entities/generated-document.entity';

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

  @OneToMany(() => Classe, (classe) => classe.etablissement)
  classes!: Classe[];

  @OneToMany(() => User, (user) => user.etablissement)
  users!: User[];

  @OneToMany(() => Enseignant, (enseignant) => enseignant.etablissement)
  enseignants!: Enseignant[];

  @OneToMany(() => Etudiant, (etudiant) => etudiant.etablissement)
  etudiants!: Etudiant[];

  @OneToMany(
    () => AnneeUniversitaire,
    (anneeUniversitaire) => anneeUniversitaire.etablissement,
  )
  anneeUniversitaires!: AnneeUniversitaire[];

  @OneToMany(() => Niveau, (niveau) => niveau.etablissement)
  niveaux!: Niveau[];

  @OneToMany(() => Matiere, (matiere) => matiere.etablissement)
  matieres!: Matiere[];

  @OneToMany(() => Salle, (salle) => salle.etablissement)
  salles!: Salle[];

  @OneToMany(() => EmploiDuTemp, (emploiDuTemp) => emploiDuTemp.etablissement)
  emploiDuTemps!: EmploiDuTemp[];

  @OneToMany(() => Presence, (presence) => presence.etablissement)
  presences!: Presence[];

  @OneToMany(() => Sanction, (sanction) => sanction.etablissement)
  sanctions!: Sanction[];

  @OneToMany(() => DailyReport, (dailyReport) => dailyReport.etablissement)
  dailyReports!: DailyReport[];

  @OneToMany(() => Document, (document) => document.etablissement)
  documents!: Document[];

  @OneToMany(() => Evaluation, (evaluation) => evaluation.etablissement)
  evaluations!: Evaluation[];

  @OneToMany(() => Note, (note) => note.etablissement)
  notes!: Note[];

  @OneToMany(() => Devoir, (devoir) => devoir.etablissement)
  devoirs!: Devoir[];

  @OneToMany(() => Submission, (submission) => submission.etablissement)
  submissions!: Submission[];

  @OneToMany(() => Inscription, (inscription) => inscription.etablissement)
  inscriptions!: Inscription[];

  @OneToMany(() => Frais, (frais) => frais.etablissement)
  fraisList!: Frais[];

  @OneToMany(() => Facture, (facture) => facture.etablissement)
  factures!: Facture[];

  @OneToMany(() => Paiement, (paiement) => paiement.etablissement)
  paiements!: Paiement[];

  @OneToMany(() => Discipline, (discipline) => discipline.etablissement)
  disciplines!: Discipline[];

  @OneToMany(
    () => GeneratedDocument,
    (generatedDocument) => generatedDocument.etablissement,
  )
  generatedDocuments!: GeneratedDocument[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
