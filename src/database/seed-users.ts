import { DataSource } from 'typeorm';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Parent } from '../parent/entities/parent.entity';
import { Presence } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from '../reporting/entities/daily-report.entity';
import { GeneratedDocument } from '../certificate/entities/generated-document.entity';
import { Document } from '../document/entities/document.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Semestre } from '../semestre/entities/semestre.entity';
import { Evaluation } from '../evaluation/entities/evaluation.entity';
import { Note } from '../note/entities/note.entity';
import { Frais } from '../finance/entities/frais.entity';
import { Facture } from '../finance/entities/facture.entity';
import { Paiement } from '../finance/entities/paiement.entity';
import { Discipline } from '../discipline/entities/discipline.entity';
import { User, Role } from '../user/entities/user.entity';
import { Devoir } from '../devoir/entities/devoir.entity';
import { Submission } from '../devoir/entities/submission.entity';
import { Salle } from '../salle/entities/salle.entity';
import { Inscription } from '../etudiant/entities/inscription.entity';
import { GlobalSetting } from '../global-setting/entities/global-setting.entity';
import { Role as AclRole } from '../acl/entities/role.entity';
import { Permission } from '../acl/entities/permission.entity';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
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
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  subscribers: [],
  migrations: [],
});

async function seedUsers() {
  try {
    await dataSource.initialize();
    console.log('Connexion établie pour le seeding des utilisateurs...');

    const userRepo = dataSource.getRepository(User);
    const enseignantRepo = dataSource.getRepository(Enseignant);
    const etablissementRepo = dataSource.getRepository(Etablissement);

    // Vérifier si un établissement existe (on en a besoin pour l'enseignant)
    let etablissement = await etablissementRepo.findOneBy({ id: 1 });
    if (!etablissement) {
      etablissement = etablissementRepo.create({
        name: 'École Supérieure Polytechnique (ESP)',
        address: 'Avenue Cheikh Anta Diop, Dakar',
        email: 'contact.esp@ucad.edu.sn',
        phone: '+221 33 864 51 96',
      });
      await etablissementRepo.save(etablissement);
      console.log('Établissement créé :', etablissement.name);
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Super Admin (pas besoin d'établissement)
    let superAdmin = await userRepo.findOneBy({ email: 'superadmin@espm.sn' });
    if (!superAdmin) {
      superAdmin = userRepo.create({
        email: 'superadmin@espm.sn',
        password: passwordHash,
        role: Role.SUPER_ADMIN,
      });
      await userRepo.save(superAdmin);
      console.log('Super Admin créé : superadmin@espm.sn / password123');
    } else {
      console.log('Super Admin déjà existant : superadmin@espm.sn');
    }

    // 2. Admin (lié à l'établissement)
    let admin = await userRepo.findOneBy({ email: 'admin@espm.sn' });
    if (!admin) {
      admin = userRepo.create({
        email: 'admin@espm.sn',
        password: passwordHash,
        role: Role.ADMIN,
        etablissement: etablissement,
      });
      await userRepo.save(admin);
      console.log('Admin créé : admin@espm.sn / password123');
    } else {
      console.log('Admin déjà existant : admin@espm.sn');
    }

    // 3. Enseignant (avec profil enseignant lié à l'établissement)
    let enseignant = await enseignantRepo.findOneBy({
      matricule: 'ESP-ENS-001',
    });
    if (!enseignant) {
      enseignant = enseignantRepo.create({
        firstName: 'Moussa',
        lastName: 'Diallo',
        email: 'enseignant@espm.sn',
        matricule: 'ESP-ENS-001',
        dateEmbauche: new Date('2023-01-01'),
        phone: '+221 77 123 45 67',
        etablissement: etablissement,
      });
      await enseignantRepo.save(enseignant);
      console.log('Profil enseignant créé :', enseignant.matricule);
    } else {
      console.log('Profil enseignant déjà existant :', enseignant.matricule);
    }

    // Créer l'utilisateur pour l'enseignant (lié à l'établissement)
    let enseignantUser = await userRepo.findOneBy({
      email: 'enseignant@espm.sn',
    });
    if (!enseignantUser) {
      enseignantUser = userRepo.create({
        email: 'enseignant@espm.sn',
        password: passwordHash,
        role: Role.ENSEIGNANT,
        enseignant: enseignant,
        etablissement: etablissement,
      });
      await userRepo.save(enseignantUser);
      console.log(
        'Utilisateur enseignant créé : enseignant@espm.sn / password123',
      );
    } else {
      console.log('Utilisateur enseignant déjà existant : enseignant@espm.sn');
    }

    console.log('\nSeeding des utilisateurs terminé avec succès !');
    console.log('Identifiants par défaut :');
    console.log('- Super Admin : superadmin@espm.sn / password123');
    console.log('- Admin : admin@espm.sn / password123');
    console.log('- Enseignant : enseignant@espm.sn / password123');
  } catch (error) {
    console.error('Erreur lors du seeding des utilisateurs :', error);
  } finally {
    await dataSource.destroy();
  }
}

seedUsers();
