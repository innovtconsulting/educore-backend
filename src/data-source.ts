import { DataSource } from 'typeorm';
import { Etablissement } from './etablissement/entities/etablissement.entity';
import { Niveau } from './niveau/entities/niveau.entity';
import { Classe } from './classe/entities/classe.entity';
import { Matiere } from './matiere/entities/matiere.entity';
import { Enseignant } from './enseignant/entities/enseignant.entity';
import { Affectation } from './enseignant/entities/affectation.entity';
import { EmploiDuTemp } from './emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from './etudiant/entities/etudiant.entity';
import { Parent } from './parent/entities/parent.entity';
import { Presence } from './presence/entities/presence.entity';
import { Sanction } from './sanction/entities/sanction.entity';
import { DailyReport } from './reporting/entities/daily-report.entity';
import { GeneratedDocument } from './certificate/entities/generated-document.entity';
import { Document } from './document/entities/document.entity';
import { AnneeUniversitaire } from './annee-universitaire/entities/annee-universitaire.entity';
import { Semestre } from './semestre/entities/semestre.entity';
import { Evaluation } from './evaluation/entities/evaluation.entity';
import { Note } from './note/entities/note.entity';
import { Frais } from './finance/entities/frais.entity';
import { Facture } from './finance/entities/facture.entity';
import { Paiement } from './finance/entities/paiement.entity';
import { Discipline } from './discipline/entities/discipline.entity';
import { User } from './user/entities/user.entity';
import { Devoir } from './devoir/entities/devoir.entity';
import { Submission } from './devoir/entities/submission.entity';
import { Salle } from './salle/entities/salle.entity';
import { Inscription } from './etudiant/entities/inscription.entity';
import { GlobalSetting } from './global-setting/entities/global-setting.entity';
import { Role as AclRole } from './acl/entities/role.entity';
import { Permission } from './acl/entities/permission.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
  entities: [
    AclRole,
    Permission,
    Etablissement,
    Niveau,
    Classe,
    Matiere,
    Enseignant,
    Affectation,
    EmploiDuTemp,
    Etudiant,
    Parent,
    Presence,
    Sanction,
    DailyReport,
    GeneratedDocument,
    Document,
    AnneeUniversitaire,
    Semestre,
    Evaluation,
    Note,
    Frais,
    Facture,
    Paiement,
    Discipline,
    User,
    Devoir,
    Submission,
    Salle,
    Inscription,
    GlobalSetting,
  ],
  ssl:
    process.env.DB_HOST === 'localhost' || !process.env.DATABASE_URL
      ? false
      : { rejectUnauthorized: false },
  subscribers: [],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/migrations/*.js'
      : 'src/migrations/*.ts',
  ],
});
