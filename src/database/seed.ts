import { AppDataSource } from '../data-source';
import { DeepPartial, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import {
  Etudiant,
  EnrollmentStatus,
} from '../etudiant/entities/etudiant.entity';
import { Parent } from '../parent/entities/parent.entity';
import { Presence } from '../presence/entities/presence.entity';
import { Sanction, SanctionType } from '../sanction/entities/sanction.entity';
import { DailyReport } from '../reporting/entities/daily-report.entity';
import {
  Document,
  DocumentCategory,
} from '../document/entities/document.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Semestre } from '../semestre/entities/semestre.entity';
import {
  Evaluation,
  EvaluationSession,
  EvaluationType,
} from '../evaluation/entities/evaluation.entity';
import { Note } from '../note/entities/note.entity';
import { Devoir } from '../devoir/entities/devoir.entity';
import { Submission } from '../devoir/entities/submission.entity';
import { Salle } from '../salle/entities/salle.entity';
import { Frais, FeeType } from '../finance/entities/frais.entity';
import { Facture, InvoiceStatus } from '../finance/entities/facture.entity';
import { Paiement, PaymentMethod } from '../finance/entities/paiement.entity';
import {
  Discipline,
  DisciplineCategory,
} from '../discipline/entities/discipline.entity';
import {
  GlobalSetting,
  SettingCategory,
} from '../global-setting/entities/global-setting.entity';
import { User, Role } from '../user/entities/user.entity';
import { Inscription } from '../etudiant/entities/inscription.entity';
import { GeneratedDocument } from '../certificate/entities/generated-document.entity';
import { Role as AclRole } from '../acl/entities/role.entity';
import { Permission } from '../acl/entities/permission.entity';
import * as bcrypt from 'bcrypt';
import { generateReceiptPdf } from '../finance/utils/pdf-generator';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function findOrCreate<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: FindOptionsWhere<T>,
  createData: DeepPartial<T>,
): Promise<T> {
  const existing = await repo.findOneBy(where);
  if (existing) return existing;
  const entity = repo.create(createData as any);
  return repo.save(entity as any);
}

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Connexion établie pour le seeding...');

    const etablissementRepo = AppDataSource.getRepository(Etablissement);
    const niveauRepo = AppDataSource.getRepository(Niveau);
    const classeRepo = AppDataSource.getRepository(Classe);
    const matiereRepo = AppDataSource.getRepository(Matiere);
    const enseignantRepo = AppDataSource.getRepository(Enseignant);
    const affectationRepo = AppDataSource.getRepository(Affectation);
    const parentRepo = AppDataSource.getRepository(Parent);
    const etudiantRepo = AppDataSource.getRepository(Etudiant);
    const emploiRepo = AppDataSource.getRepository(EmploiDuTemp);
    const presenceRepo = AppDataSource.getRepository(Presence);
    const sanctionRepo = AppDataSource.getRepository(Sanction);
    const dailyReportRepo = AppDataSource.getRepository(DailyReport);
    const documentRepo = AppDataSource.getRepository(Document);
    const anneeRepo = AppDataSource.getRepository(AnneeUniversitaire);
    const semestreRepo = AppDataSource.getRepository(Semestre);
    const evaluationRepo = AppDataSource.getRepository(Evaluation);
    const noteRepo = AppDataSource.getRepository(Note);
    const fraisRepo = AppDataSource.getRepository(Frais);
    const factureRepo = AppDataSource.getRepository(Facture);
    const paiementRepo = AppDataSource.getRepository(Paiement);
    const devoirRepo = AppDataSource.getRepository(Devoir);
    const submissionRepo = AppDataSource.getRepository(Submission);
    const salleRepo = AppDataSource.getRepository(Salle);
    const globalSettingRepo = AppDataSource.getRepository(GlobalSetting);
    const inscriptionRepo = AppDataSource.getRepository(Inscription);
    const userRepo = AppDataSource.getRepository(User);
    const roleAclRepo = AppDataSource.getRepository(AclRole);
    const permissionRepo = AppDataSource.getRepository(Permission);

    // 0. Configuration Globale
    const defaultSettings = [
      {
        key: 'ACADEMIC_PASSING_GRADE',
        value: '10',
        category: SettingCategory.ACADEMIC,
        description: 'Moyenne de passage par défaut',
      },
      {
        key: 'ACADEMIC_ELIMINATION_THRESHOLD',
        value: '4',
        category: SettingCategory.ACADEMIC,
        description: 'Note éliminatoire',
      },
      {
        key: 'ENABLE_STUDENT_REGISTRATION',
        value: 'true',
        category: SettingCategory.SECURITY,
        description: "Autoriser l'auto-inscription des étudiants",
      },
      {
        key: 'ENABLE_TEACHER_REGISTRATION',
        value: 'true',
        category: SettingCategory.SECURITY,
        description: "Autoriser l'auto-inscription des enseignants",
      },
      {
        key: 'FINANCIAL_CURRENCY',
        value: 'CFA',
        category: SettingCategory.FINANCIAL,
        description: 'Devise du système',
      },
    ];
    await globalSettingRepo.save(
      defaultSettings.map((s) => globalSettingRepo.create(s)),
    );

    // 0.0 Permissions et Rôles ACL
    const perms = [
      // Étudiants
      { name: 'STUDENT_VIEW', description: 'Voir les étudiants' },
      { name: 'STUDENT_CREATE', description: 'Créer un étudiant' },
      { name: 'STUDENT_EDIT', description: 'Modifier un étudiant' },
      { name: 'STUDENT_DELETE', description: 'Supprimer un étudiant' },
      { name: 'STUDENT_VALIDATE', description: 'Valider une inscription' },

      // Enseignants
      { name: 'TEACHER_VIEW', description: 'Voir les enseignants' },
      { name: 'TEACHER_MANAGE', description: 'Gérer les enseignants' },

      // Finances
      { name: 'FINANCE_VIEW', description: 'Voir les finances' },
      {
        name: 'FINANCE_MANAGE',
        description: 'Gérer les factures et paiements',
      },
      { name: 'FINANCE_REPORT', description: 'Voir les rapports financiers' },

      // Académique
      { name: 'ACADEMIC_VIEW', description: 'Voir les notes et bulletins' },
      {
        name: 'ACADEMIC_MANAGE',
        description: 'Gérer les notes et évaluations',
      },
      {
        name: 'ACADEMIC_CONFIG',
        description: 'Configurer les classes/matières',
      },

      // Planning & Présence
      { name: 'SCHEDULE_VIEW', description: 'Voir l emploi du temps' },
      { name: 'SCHEDULE_MANAGE', description: 'Gérer l emploi du temps' },
      { name: 'ATTENDANCE_MANAGE', description: 'Gérer les présences' },

      // Discipline & Vie Scolaire
      {
        name: 'DISCIPLINE_MANAGE',
        description: 'Gérer les sanctions et règlements',
      },
      {
        name: 'REPORT_DAILY_MANAGE',
        description: 'Gérer les rapports quotidiens',
      },

      // Administration & Système
      { name: 'USER_MANAGE', description: 'Gérer les comptes utilisateurs' },
      { name: 'CONFIG_MANAGE', description: 'Gérer la configuration globale' },
      { name: 'DOCUMENT_MANAGE', description: 'Gérer la GED' },
    ];
    const savedPerms = [] as Permission[];
    for (const permissionData of perms) {
      const permission = await findOrCreate(
        permissionRepo,
        { name: permissionData.name },
        permissionData,
      );
      savedPerms.push(permission);
    }

    const getPerms = (names: string[]) =>
      savedPerms.filter((p) => names.includes(p.name));

    const roleAdminAcl = await findOrCreate(
      roleAclRepo,
      { name: 'Admin' },
      {
        name: 'Admin',
        description: "Administrateur d'établissement",
        permissions: savedPerms,
      },
    );
    const roleComptableAcl = await findOrCreate(
      roleAclRepo,
      { name: 'Comptable' },
      {
        name: 'Comptable',
        description: 'Gestionnaire financier',
        permissions: getPerms([
          'FINANCE_VIEW',
          'FINANCE_MANAGE',
          'FINANCE_REPORT',
          'STUDENT_VIEW',
          'ACADEMIC_VIEW',
        ]),
      },
    );
    const roleSurveillantAcl = await findOrCreate(
      roleAclRepo,
      { name: 'Surveillant' },
      {
        name: 'Surveillant',
        description: 'Gestionnaire de la vie scolaire',
        permissions: getPerms([
          'STUDENT_VIEW',
          'STUDENT_CREATE',
          'STUDENT_EDIT',
          'STUDENT_VALIDATE',
          'ATTENDANCE_MANAGE',
          'DISCIPLINE_MANAGE',
          'REPORT_DAILY_MANAGE',
          'SCHEDULE_VIEW',
          'ACADEMIC_VIEW',
        ]),
      },
    );
    const roleEnseignantAcl = await findOrCreate(
      roleAclRepo,
      { name: 'Enseignant' },
      {
        name: 'Enseignant',
        description: 'Personnel académique',
        permissions: getPerms([
          'STUDENT_VIEW',
          'ACADEMIC_VIEW',
          'ACADEMIC_MANAGE',
          'SCHEDULE_VIEW',
          'ATTENDANCE_MANAGE',
        ]),
      },
    );

    await roleAclRepo.save([
      roleAdminAcl,
      roleComptableAcl,
      roleSurveillantAcl,
      roleEnseignantAcl,
    ]);

    // 1. Établissements
    const fst = await findOrCreate(
      etablissementRepo,
      { email: 'contact.fst@ucad.edu.sn' },
      {
        name: 'Faculté des Sciences et Techniques (FST)',
        address: 'UCAD, Dakar',
        email: 'contact.fst@ucad.edu.sn',
        phone: '+221 33 825 00 00',
      },
    );
    const esp = await findOrCreate(
      etablissementRepo,
      { email: 'contact.esp@ucad.edu.sn' },
      {
        name: 'École Supérieure Polytechnique (ESP)',
        address: 'Avenue Cheikh Anta Diop, Dakar',
        email: 'contact.esp@ucad.edu.sn',
        phone: '+221 33 864 51 96',
      },
    );
    const iut = await findOrCreate(
      etablissementRepo,
      { email: 'contact.iut@ucad.edu.sn' },
      {
        name: 'Institut Universitaire de Technologie (IUT)',
        address: 'UCAD, Dakar',
        email: 'contact.iut@ucad.edu.sn',
        phone: '+221 33 824 00 00',
      },
    );

    // 1.1 Année Universitaire
    const annee2026 = await findOrCreate(
      anneeRepo,
      { label: '2026-2027', etablissementId: fst.id },
      {
        label: '2026-2027',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2027-07-31'),
        isActive: true,
        etablissement: fst,
      },
    );

    // 3. Classes (Parcours)
    const informatiqueFst = await findOrCreate(
      classeRepo,
      { name: 'Informatique', etablissement: { id: fst.id } as any },
      {
        name: 'Informatique',
        etablissement: fst,
      },
    );
    const informatiqueEsp = await findOrCreate(
      classeRepo,
      { name: 'Informatique', etablissement: { id: esp.id } as any },
      {
        name: 'Informatique',
        etablissement: esp,
      },
    );
    const mathematiquesFst = await findOrCreate(
      classeRepo,
      { name: 'Mathématiques', etablissement: { id: fst.id } as any },
      {
        name: 'Mathématiques',
        etablissement: fst,
      },
    );
    const genieElectriqueIut = await findOrCreate(
      classeRepo,
      { name: 'Génie Électrique', etablissement: { id: iut.id } as any },
      {
        name: 'Génie Électrique',
        etablissement: iut,
      },
    );

    // 2. Niveaux (now after Classes)
    const l1Fst = niveauRepo.create({
      name: 'Licence 1',
      classe: informatiqueFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const l2Fst = niveauRepo.create({
      name: 'Licence 2',
      classe: informatiqueFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const l3Fst = niveauRepo.create({
      name: 'Licence 3',
      classe: informatiqueFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const m1Fst = niveauRepo.create({
      name: 'Master 1',
      classe: informatiqueFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const m2Fst = niveauRepo.create({
      name: 'Master 2',
      classe: informatiqueFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const l1Esp = niveauRepo.create({
      name: 'Licence 1',
      classe: informatiqueEsp,
      etablissement: esp,
      etablissementId: esp.id,
    });
    const l2Esp = niveauRepo.create({
      name: 'Licence 2',
      classe: informatiqueEsp,
      etablissement: esp,
      etablissementId: esp.id,
    });
    const l1Math = niveauRepo.create({
      name: 'Licence 1',
      classe: mathematiquesFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const l2Math = niveauRepo.create({
      name: 'Licence 2',
      classe: mathematiquesFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const l3Math = niveauRepo.create({
      name: 'Licence 3',
      classe: mathematiquesFst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const dut1Iut = niveauRepo.create({
      name: 'DUT 1',
      classe: genieElectriqueIut,
      etablissement: iut,
      etablissementId: iut.id,
    });
    const dut2Iut = niveauRepo.create({
      name: 'DUT 2',
      classe: genieElectriqueIut,
      etablissement: iut,
      etablissementId: iut.id,
    });
    await niveauRepo.save([
      l1Fst,
      l2Fst,
      l3Fst,
      m1Fst,
      m2Fst,
      l1Esp,
      l2Esp,
      l1Math,
      l2Math,
      l3Math,
      dut1Iut,
      dut2Iut,
    ]);

    // 4. Matières
    const algoFst = matiereRepo.create({
      code: 'INF101',
      name: 'Algorithmique 1',
      coefficient: 4,
      niveau: l1Fst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const baseDonneesFst = matiereRepo.create({
      code: 'INF201',
      name: 'Bases de Données',
      coefficient: 3,
      niveau: l2Fst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const reseauxFst = matiereRepo.create({
      code: 'INF301',
      name: 'Réseaux Informatiques',
      coefficient: 3,
      niveau: l3Fst,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const electroniqueIut = matiereRepo.create({
      code: 'GE101',
      name: 'Électronique Fondamentale',
      coefficient: 3,
      niveau: dut1Iut,
      etablissement: iut,
      etablissementId: iut.id,
    });
    await matiereRepo.save([
      algoFst,
      baseDonneesFst,
      reseauxFst,
      electroniqueIut,
    ]);

    // 5. Enseignants
    const profDiallo = enseignantRepo.create({
      firstName: 'Moussa',
      lastName: 'Diallo',
      email: 'moussa.diallo@ucad.edu.sn',
      matricule: 'FST-INF-001',
      dateEmbauche: new Date('2020-01-01'),
      phone: '+221 77 123 45 67',
      etablissement: fst,
      etablissementId: fst.id,
    });
    const profSow = enseignantRepo.create({
      firstName: 'Mariam',
      lastName: 'Sow',
      email: 'mariam.sow@ucad.edu.sn',
      matricule: 'FST-MAT-001',
      dateEmbauche: new Date('2021-01-01'),
      phone: '+221 77 987 65 43',
      etablissement: fst,
      etablissementId: fst.id,
    });
    const profNdiaye = enseignantRepo.create({
      firstName: 'Abdou',
      lastName: 'Ndiaye',
      email: 'abdou.ndiaye@ucad.edu.sn',
      matricule: 'IUT-GE-001',
      dateEmbauche: new Date('2022-01-01'),
      phone: '+221 77 555 44 33',
      etablissement: iut,
      etablissementId: iut.id,
    });
    await enseignantRepo.save([profDiallo, profSow, profNdiaye]);

    // 6. Affectations
    const aff1 = affectationRepo.create({
      enseignant: profDiallo,
      matiere: algoFst,
      etablissement: fst,
      niveau: l1Fst,
    });
    const aff2 = affectationRepo.create({
      enseignant: profDiallo,
      matiere: baseDonneesFst,
      etablissement: esp,
      niveau: l2Esp,
    });
    const aff3 = affectationRepo.create({
      enseignant: profSow,
      matiere: algoFst,
      etablissement: fst,
      niveau: l1Fst,
    });
    const aff4 = affectationRepo.create({
      enseignant: profNdiaye,
      matiere: electroniqueIut,
      etablissement: iut,
      niveau: dut1Iut,
    });
    await affectationRepo.save([aff1, aff2, aff3, aff4]);

    // 7. Parents
    const parent1 = parentRepo.create({
      firstName: 'Modou',
      lastName: 'Sow',
      gender: 'Père' as any,
      phoneNumber: '+221 77 111 22 33',
      email: 'modou.sow@email.sn',
      etablissement: fst,
      etablissementId: fst.id,
    });
    const parent2 = parentRepo.create({
      firstName: 'Awa',
      lastName: 'Sow',
      gender: 'Mère' as any,
      phoneNumber: '+221 77 444 55 66',
      etablissement: fst,
      etablissementId: fst.id,
    });
    const parent3 = parentRepo.create({
      firstName: 'Ibrahima',
      lastName: 'Ndiaye',
      gender: 'Père' as any,
      phoneNumber: '+221 77 666 77 88',
      etablissement: iut,
      etablissementId: iut.id,
    });
    await parentRepo.save([parent1, parent2, parent3]);

    // 8. Étudiants
    const etudiant1 = etudiantRepo.create({
      firstName: 'Ousmane',
      lastName: 'Sow',
      email: 'ousmane.sow@email.sn',
      matricule: 'ETU-2026-001',
      etablissement: fst,
      classe: informatiqueFst,
      niveau: l1Fst,
      parents: [parent1, parent2],
    });
    const etudiant2 = etudiantRepo.create({
      firstName: 'Fatou',
      lastName: 'Sow',
      email: 'fatou.sow@email.sn',
      matricule: 'ETU-2026-002',
      etablissement: esp,
      classe: informatiqueEsp,
      niveau: l2Esp,
      parents: [parent1],
    });
    const etudiant3 = etudiantRepo.create({
      firstName: 'Amadou',
      lastName: 'Ndiaye',
      email: 'amadou.ndiaye@email.sn',
      matricule: 'ETU-2026-003',
      etablissement: iut,
      classe: genieElectriqueIut,
      niveau: dut1Iut,
      parents: [parent3],
    });
    const etudiantWait = etudiantRepo.create({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@email.sn',
      status: EnrollmentStatus.EN_ATTENTE,
      etablissement: fst,
      classe: informatiqueFst,
      niveau: l1Fst,
    });

    const fstStudentsList = [
      etudiant1,
      etudiantWait,
      etudiantRepo.create({
        firstName: 'Alassane',
        lastName: 'Diop',
        email: 'alassane.diop@email.sn',
        matricule: 'ETU-FST-001',
        status: EnrollmentStatus.ACTIF,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'Bineta',
        lastName: 'Fall',
        email: 'bineta.fall@email.sn',
        matricule: 'ETU-FST-002',
        status: EnrollmentStatus.ACTIF,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'Cheikh',
        lastName: 'Gueye',
        email: 'cheikh.gueye@email.sn',
        matricule: 'ETU-FST-003',
        status: EnrollmentStatus.ACTIF,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'Dior',
        lastName: 'Mbacke',
        email: 'dior.mbacke@email.sn',
        matricule: 'ETU-FST-004',
        status: EnrollmentStatus.ACTIF,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'El Hadji',
        lastName: 'Ndiaye',
        email: 'elhadji.ndiaye@email.sn',
        matricule: 'ETU-FST-005',
        status: EnrollmentStatus.ACTIF,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'Aminata',
        lastName: 'Toure',
        email: 'aminata.toure@email.sn',
        matricule: 'ETU-FST-006',
        status: EnrollmentStatus.ACTIF,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'Bocar',
        lastName: 'Kane',
        email: 'bocar.kane@email.sn',
        status: EnrollmentStatus.EN_ATTENTE,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
      etudiantRepo.create({
        firstName: 'Coumba',
        lastName: 'Ly',
        email: 'coumba.ly@email.sn',
        status: EnrollmentStatus.EN_ATTENTE,
        etablissement: fst,
        classe: informatiqueFst,
        niveau: l1Fst,
      }),
    ];

    const espStudentsList = [
      etudiant2,
      etudiantRepo.create({
        firstName: 'Gorgui',
        lastName: 'Cisse',
        email: 'gorgui.cisse@email.sn',
        matricule: 'ETU-ESP-001',
        status: EnrollmentStatus.ACTIF,
        etablissement: esp,
        classe: informatiqueEsp,
        niveau: l2Esp,
      }),
      etudiantRepo.create({
        firstName: 'Haby',
        lastName: 'Dia',
        email: 'haby.dia@email.sn',
        matricule: 'ETU-ESP-002',
        status: EnrollmentStatus.ACTIF,
        etablissement: esp,
        classe: informatiqueEsp,
        niveau: l2Esp,
      }),
      etudiantRepo.create({
        firstName: 'Ibrahima',
        lastName: 'Diagne',
        email: 'ibrahima.diagne@email.sn',
        matricule: 'ETU-ESP-003',
        status: EnrollmentStatus.ACTIF,
        etablissement: esp,
        classe: informatiqueEsp,
        niveau: l2Esp,
      }),
      etudiantRepo.create({
        firstName: 'Khadija',
        lastName: 'Faye',
        email: 'khadija.faye@email.sn',
        matricule: 'ETU-ESP-004',
        status: EnrollmentStatus.ACTIF,
        etablissement: esp,
        classe: informatiqueEsp,
        niveau: l2Esp,
      }),
      etudiantRepo.create({
        firstName: 'Lamine',
        lastName: 'Seck',
        email: 'lamine.seck@email.sn',
        status: EnrollmentStatus.EN_ATTENTE,
        etablissement: esp,
        classe: informatiqueEsp,
        niveau: l2Esp,
      }),
      etudiantRepo.create({
        firstName: 'Marieme',
        lastName: 'Gadiaga',
        email: 'marieme.g@email.sn',
        status: EnrollmentStatus.EN_ATTENTE,
        etablissement: esp,
        classe: informatiqueEsp,
        niveau: l2Esp,
      }),
    ];

    const iutStudentsList = [
      etudiant3,
      etudiantRepo.create({
        firstName: 'Maimouna',
        lastName: 'Badiane',
        email: 'maimouna.badiane@email.sn',
        matricule: 'ETU-IUT-001',
        status: EnrollmentStatus.ACTIF,
        etablissement: iut,
        classe: genieElectriqueIut,
        niveau: dut1Iut,
      }),
      etudiantRepo.create({
        firstName: 'Ndeye',
        lastName: 'Sarr',
        email: 'ndeye.sarr@email.sn',
        matricule: 'ETU-IUT-002',
        status: EnrollmentStatus.ACTIF,
        etablissement: iut,
        classe: genieElectriqueIut,
        niveau: dut1Iut,
      }),
      etudiantRepo.create({
        firstName: 'Oumar',
        lastName: 'Thiam',
        email: 'oumar.thiam@email.sn',
        matricule: 'ETU-IUT-003',
        status: EnrollmentStatus.ACTIF,
        etablissement: iut,
        classe: genieElectriqueIut,
        niveau: dut1Iut,
      }),
      etudiantRepo.create({
        firstName: 'Penda',
        lastName: 'Wade',
        email: 'penda.wade@email.sn',
        status: EnrollmentStatus.EN_ATTENTE,
        etablissement: iut,
        classe: genieElectriqueIut,
        niveau: dut1Iut,
      }),
    ];

    const allStudents = [
      ...fstStudentsList,
      ...espStudentsList,
      ...iutStudentsList,
    ];
    await etudiantRepo.save(allStudents);

    // 8.1 Salles
    const salle101 = salleRepo.create({
      name: 'Salle 101',
      capacity: 40,
      etablissement: fst,
    });
    const salle102 = salleRepo.create({
      name: 'Salle 102',
      capacity: 30,
      etablissement: esp,
    });
    const laboInfo = salleRepo.create({
      name: 'Laboratoire Info',
      capacity: 25,
      etablissement: fst,
    });
    await salleRepo.save([salle101, salle102, laboInfo]);

    // 9. Emploi du Temps
    const cours1 = emploiRepo.create({
      startTime: new Date('2026-06-08T08:00:00Z'),
      endTime: new Date('2026-06-08T10:00:00Z'),
      matiere: algoFst,
      enseignant: profDiallo,
      etablissement: fst,
      classe: informatiqueFst,
      niveau: l1Fst,
      salle: salle101,
    });
    await emploiRepo.save(cours1);

    // 10. Présence
    const pres1 = presenceRepo.create({
      etudiant: etudiant1,
      emploiDuTemp: cours1,
      status: 'Présent' as any,
      remark: "À l'heure",
      etablissement: fst,
      etablissementId: fst.id,
    });
    await presenceRepo.save(pres1);

    // 11. Sanctions
    const sanc1 = sanctionRepo.create({
      etudiant: etudiant1,
      type: SanctionType.AVERTISSEMENT,
      motif: "Retards répétés au cours d'Algorithmique",
      dateDecision: new Date('2026-06-09'),
      isApplied: true,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await sanctionRepo.save(sanc1);

    // 12. Finance - Données enrichies pour le tableau de bord
    // Frais pour différents niveaux et classes
    const fraisList = [
      // FST - L1
      {
        name: 'Scolarité L1 Informatique',
        amount: 500000,
        type: FeeType.SCOLARITE,
        classe: informatiqueFst,
        niveau: l1Fst,
        etablissement: fst,
        etablissementId: fst.id,
      },
      {
        name: "Frais d'inscription L1",
        amount: 50000,
        type: FeeType.INSCRIPTION,
        classe: informatiqueFst,
        niveau: l1Fst,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // FST - L2
      {
        name: 'Scolarité L2 Informatique',
        amount: 550000,
        type: FeeType.SCOLARITE,
        classe: informatiqueFst,
        niveau: l2Fst,
        etablissement: fst,
        etablissementId: fst.id,
      },
      {
        name: "Frais d'inscription L2",
        amount: 55000,
        type: FeeType.INSCRIPTION,
        classe: informatiqueFst,
        niveau: l2Fst,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // FST - L3
      {
        name: 'Scolarité L3 Informatique',
        amount: 600000,
        type: FeeType.SCOLARITE,
        classe: informatiqueFst,
        niveau: l3Fst,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // ESP - L1
      {
        name: 'Scolarité L1 Informatique ESP',
        amount: 450000,
        type: FeeType.SCOLARITE,
        classe: informatiqueEsp,
        niveau: l1Esp,
        etablissement: esp,
        etablissementId: esp.id,
      },
      {
        name: "Frais d'inscription L1 ESP",
        amount: 45000,
        type: FeeType.INSCRIPTION,
        classe: informatiqueEsp,
        niveau: l1Esp,
        etablissement: esp,
        etablissementId: esp.id,
      },
      // ESP - L2
      {
        name: 'Scolarité L2 Informatique ESP',
        amount: 480000,
        type: FeeType.SCOLARITE,
        classe: informatiqueEsp,
        niveau: l2Esp,
        etablissement: esp,
        etablissementId: esp.id,
      },
    ];
    const savedFrais = await fraisRepo.save(fraisList);

    // Factures pour différents étudiants avec différents statuts
    const facturesList = [
      // Étudiant 1 - FST - Plusieurs factures
      {
        numero: 'FAC-2026-0001',
        etudiant: etudiant1,
        dateEmission: new Date('2026-01-15'),
        dateEcheance: new Date('2026-02-15'),
        montantTotal: 550000,
        status: InvoiceStatus.PAYE,
        etablissement: fst,
        etablissementId: fst.id,
      },
      {
        numero: 'FAC-2026-0002',
        etudiant: etudiant1,
        dateEmission: new Date('2026-06-01'),
        dateEcheance: new Date('2026-07-01'),
        montantTotal: 600000,
        status: InvoiceStatus.PARTIEL,
        etablissement: fst,
        etablissementId: fst.id,
      },
      {
        numero: 'FAC-2026-0003',
        etudiant: etudiant1,
        dateEmission: new Date('2026-06-10'),
        dateEcheance: new Date('2026-07-10'),
        montantTotal: 50000,
        status: InvoiceStatus.VALIDE,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // Étudiant 2 - ESP - Factures
      {
        numero: 'FAC-2026-0004',
        etudiant: etudiant2,
        dateEmission: new Date('2026-02-20'),
        dateEcheance: new Date('2026-03-20'),
        montantTotal: 495000,
        status: InvoiceStatus.PAYE,
        etablissement: esp,
        etablissementId: esp.id,
      },
      {
        numero: 'FAC-2026-0005',
        etudiant: etudiant2,
        dateEmission: new Date('2026-06-05'),
        dateEcheance: new Date('2026-07-05'),
        montantTotal: 525000,
        status: InvoiceStatus.VALIDE,
        etablissement: esp,
        etablissementId: esp.id,
      },
      // Étudiant 3 - IUT - Une facture impayée
      {
        numero: 'FAC-2026-0006',
        etudiant: etudiant3,
        dateEmission: new Date('2026-06-12'),
        dateEcheance: new Date('2026-07-12'),
        montantTotal: 655000,
        status: InvoiceStatus.VALIDE,
        etablissement: iut,
        etablissementId: iut.id,
      },
      // Étudiant 2 - ESP - Facture partiellement payée
      {
        numero: 'FAC-2026-0007',
        etudiant: etudiant2,
        dateEmission: new Date('2026-05-01'),
        dateEcheance: new Date('2026-06-01'),
        montantTotal: 450000,
        status: InvoiceStatus.PARTIEL,
        etablissement: esp,
        etablissementId: esp.id,
      },
      // Étudiant 1 - FST - Facture payée
      {
        numero: 'FAC-2026-0008',
        etudiant: etudiant1,
        dateEmission: new Date('2026-04-10'),
        dateEcheance: new Date('2026-05-10'),
        montantTotal: 500000,
        status: InvoiceStatus.PAYE,
        etablissement: fst,
        etablissementId: fst.id,
      },
    ];
    const savedFactures = await factureRepo.save(facturesList);

    // Paiements avec différents modes et dates pour l'évolution mensuelle
    const paiementsList = [
      // Janvier - Paiements
      {
        reference: 'PAY-2026-0001',
        etudiant: etudiant1,
        facture: savedFactures[0],
        montant: 550000,
        datePaiement: new Date('2026-01-20'),
        modePaiement: PaymentMethod.WAVE,
        etablissement: fst,
        etablissementId: fst.id,
      },
      {
        reference: 'PAY-2026-0002',
        etudiant: etudiant2,
        facture: savedFactures[3],
        montant: 495000,
        datePaiement: new Date('2026-02-25'),
        modePaiement: PaymentMethod.ESPECES,
        etablissement: esp,
        etablissementId: esp.id,
      },
      // Février - Paiements
      {
        reference: 'PAY-2026-0003',
        etudiant: etudiant2,
        facture: savedFactures[6],
        montant: 200000,
        datePaiement: new Date('2026-02-15'),
        modePaiement: PaymentMethod.ORANGE_MONEY,
        etablissement: esp,
        etablissementId: esp.id,
      },
      // Mars - Paiements
      {
        reference: 'PAY-2026-0004',
        etudiant: etudiant1,
        facture: savedFactures[7],
        montant: 500000,
        datePaiement: new Date('2026-03-15'),
        modePaiement: PaymentMethod.VIREMENT,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // Avril - Paiements
      {
        reference: 'PAY-2026-0005',
        etudiant: etudiant1,
        facture: savedFactures[1],
        montant: 300000,
        datePaiement: new Date('2026-04-10'),
        modePaiement: PaymentMethod.WAVE,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // Mai - Paiements
      {
        reference: 'PAY-2026-0006',
        etudiant: etudiant1,
        facture: savedFactures[1],
        montant: 200000,
        datePaiement: new Date('2026-05-20'),
        modePaiement: PaymentMethod.ESPECES,
        etablissement: fst,
        etablissementId: fst.id,
      },
      {
        reference: 'PAY-2026-0007',
        etudiant: etudiant2,
        facture: savedFactures[6],
        montant: 150000,
        datePaiement: new Date('2026-05-25'),
        modePaiement: PaymentMethod.WAVE,
        etablissement: esp,
        etablissementId: esp.id,
      },
      // Juin - Paiements
      {
        reference: 'PAY-2026-0008',
        etudiant: etudiant2,
        facture: savedFactures[4],
        montant: 300000,
        datePaiement: new Date('2026-06-15'),
        modePaiement: PaymentMethod.ORANGE_MONEY,
        etablissement: esp,
        etablissementId: esp.id,
      },
      {
        reference: 'PAY-2026-0009',
        etudiant: etudiant1,
        facture: savedFactures[1],
        montant: 100000,
        datePaiement: new Date('2026-06-25'),
        modePaiement: PaymentMethod.ESPECES,
        etablissement: fst,
        etablissementId: fst.id,
      },
      // Paiement du jour courant pour le dashboard
      {
        reference: 'PAY-2026-0010',
        etudiant: etudiant2,
        facture: savedFactures[4],
        montant: 150000,
        datePaiement: new Date(),
        modePaiement: PaymentMethod.WAVE,
        etablissement: esp,
        etablissementId: esp.id,
      },
    ];
    const savedPaiements = await paiementRepo.save(paiementsList);

    // Mettre à jour les statuts des factures après les paiements
    // Facture 1 (PAYE) - déjà correct
    // Facture 2 (PARTIEL) - 300k + 200k + 100k = 600k payé sur 600k -> PAYE
    savedFactures[1].status = InvoiceStatus.PAYE;
    // Facture 3 (IMPAYE) - reste IMPAYE
    // Facture 4 (PAYE) - déjà correct
    // Facture 5 (VALIDE) - 300k payé sur 525k -> PARTIEL
    savedFactures[4].status = InvoiceStatus.PARTIEL;
    // Facture 6 (IMPAYE) - reste IMPAYE
    // Facture 7 (PARTIEL) - 200k + 150k = 350k payé sur 450k -> PARTIEL
    savedFactures[6].status = InvoiceStatus.PARTIEL;
    // Facture 8 (PAYE) - déjà correct

    await factureRepo.save(savedFactures);

    // Générer les reçus PDF pour quelques paiements
    for (const paiement of savedPaiements.slice(0, 5)) {
      try {
        const recuPath = await generateReceiptPdf(paiement);
        paiement.recuPath = recuPath;
        await paiementRepo.save(paiement);
      } catch (e) {
        console.warn(`Échec génération PDF pour paiement ${paiement.reference}`);
      }
    }

    // 13. Rapport Quotidien
    const dailyReport = dailyReportRepo.create({
      date: '2026-06-09',
      supervisorName: 'M. Faye',
      observations:
        'Journée calme, quelques retards signalés en début de matinée.',
      totalAbsences: 0,
      totalRetards: 0,
      totalSanctions: 1,
      isSubmitted: true,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await dailyReportRepo.save(dailyReport);

    // 14. Document
    const docDirectory = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(docDirectory)) {
      fs.mkdirSync(docDirectory, { recursive: true });
    }
    const docPath = path.join(docDirectory, 'calendrier_2026.pdf');
    fs.writeFileSync(docPath, 'Dummy PDF content for seeding');

    const doc1 = documentRepo.create({
      title: 'Calendrier Académique 2026-2027',
      description: 'Calendrier officiel des cours et examens',
      category: DocumentCategory.ADMINISTRATIF,
      filePath: 'uploads/documents/calendrier_2026.pdf',
      originalName: 'calendrier_2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 500, // 500 KB
      etablissement: fst,
      etablissementId: fst.id,
    });
    await documentRepo.save(doc1);

    // 15. Semestre, Evaluations et Notes
    const semestre1 = semestreRepo.create({
      name: 'Semestre 1',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-02-28'),
      isActive: true,
      anneeUniversitaire: annee2026,
    });
    await semestreRepo.save(semestre1);

    const evalCC = evaluationRepo.create({
      title: 'Contrôle Continu Algorithmique',
      type: EvaluationType.CC,
      session: EvaluationSession.NORMALE,
      weight: 0.4,
      date: new Date('2026-11-15'),
      matiere: algoFst,
      classe: informatiqueFst,
      niveau: l1Fst,
      semestre: semestre1,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const evalExam = evaluationRepo.create({
      title: 'Examen Final Algorithmique',
      type: EvaluationType.EXAMEN,
      session: EvaluationSession.NORMALE,
      weight: 0.6,
      date: new Date('2027-01-20'),
      matiere: algoFst,
      classe: informatiqueFst,
      niveau: l1Fst,
      semestre: semestre1,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await evaluationRepo.save([evalCC, evalExam]);

    const noteCC = noteRepo.create({
      value: 12.5,
      etudiant: etudiant1,
      evaluation: evalCC,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const noteExam = noteRepo.create({
      value: 8.0, // Moyenne matière (12.5*0.4 + 8*0.6) = 5+4.8 = 9.8 (<10)
      etudiant: etudiant1,
      evaluation: evalExam,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await noteRepo.save([noteCC, noteExam]);

    // Ajout d'une session de rattrapage
    const evalRattrapage = evaluationRepo.create({
      title: 'Rattrapage Algorithmique',
      type: EvaluationType.EXAMEN,
      session: EvaluationSession.RATTRAPAGE,
      weight: 0.6,
      date: new Date('2027-02-15'),
      matiere: algoFst,
      classe: informatiqueFst,
      niveau: l1Fst,
      semestre: semestre1,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await evaluationRepo.save(evalRattrapage);

    const noteRattrapage = noteRepo.create({
      value: 14.0, // Nouvelle moyenne (12.5*0.4 + 14*0.6) = 5+8.4 = 13.4 (>10)
      etudiant: etudiant1,
      evaluation: evalRattrapage,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await noteRepo.save(noteRattrapage);

    // 16. Discipline et Règlement Intérieur
    const disciplineRepo = AppDataSource.getRepository(Discipline);
    const reglement1 = disciplineRepo.create({
      title: 'Tenue Vestimentaire',
      content:
        "Le port de la blouse est obligatoire pour tous les étudiants dans l'enceinte de l'établissement.",
      category: DisciplineCategory.REGLEMENT_INTERIEUR,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const reglement2 = disciplineRepo.create({
      title: 'Usage des Smartphones',
      content:
        "L'utilisation des téléphones portables est strictement interdite durant les heures de cours et d'examen.",
      category: DisciplineCategory.DISCIPLINE,
      etablissement: fst,
      etablissementId: fst.id,
    });
    await disciplineRepo.save([reglement1, reglement2]);

    // 17. Utilisateurs
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      userRepo.create({
        email: 'superadmin@espm.sn',
        username: 'superadmin',
        password: passwordHash,
        role: Role.SUPER_ADMIN,
        photoPath: 'uploads/profiles/default-admin.png',
      }),
      // --- FST Tenant ---
      userRepo.create({
        email: 'admin@espm.sn',
        username: 'admin',
        password: passwordHash,
        role: Role.ADMIN,
        aclRole: roleAdminAcl,
        etablissement: fst,
      }),
      // Utilisateur Admin prêt à être activé (pas de mot de passe)
      userRepo.create({
        email: 'activation.admin@espm.sn',
        username: 'activation_admin',
        role: Role.ADMIN,
        isActive: false,
        aclRole: roleAdminAcl,
        etablissement: fst,
      }),
      userRepo.create({
        email: 'comptable@espm.sn',
        username: 'comptable',
        password: passwordHash,
        role: Role.COMPTABLE,
        aclRole: roleComptableAcl,
        etablissement: fst,
      }),
      userRepo.create({
        email: 'surveillant@espm.sn',
        username: 'surveillant',
        password: passwordHash,
        role: Role.SURVEILLANT,
        aclRole: roleSurveillantAcl,
        etablissement: fst,
      }),

      // --- ESP Tenant ---
      userRepo.create({
        email: 'admin.esp@espm.sn',
        username: 'admin_esp',
        password: passwordHash,
        role: Role.ADMIN,
        aclRole: roleAdminAcl,
        etablissement: esp,
      }),
      userRepo.create({
        email: 'comptable.esp@espm.sn',
        username: 'comptable_esp',
        password: passwordHash,
        role: Role.COMPTABLE,
        aclRole: roleComptableAcl,
        etablissement: esp,
      }),
      userRepo.create({
        email: 'surveillant.esp@espm.sn',
        username: 'surveillant_esp',
        password: passwordHash,
        role: Role.SURVEILLANT,
        aclRole: roleSurveillantAcl,
        etablissement: esp,
      }),

      // --- IUT Tenant ---
      userRepo.create({
        email: 'admin.iut@espm.sn',
        username: 'admin_iut',
        password: passwordHash,
        role: Role.ADMIN,
        aclRole: roleAdminAcl,
        etablissement: iut,
      }),
      userRepo.create({
        email: 'comptable.iut@espm.sn',
        username: 'comptable_iut',
        password: passwordHash,
        role: Role.COMPTABLE,
        aclRole: roleComptableAcl,
        etablissement: iut,
      }),
      userRepo.create({
        email: 'surveillant.iut@espm.sn',
        username: 'surveillant_iut',
        password: passwordHash,
        role: Role.SURVEILLANT,
        aclRole: roleSurveillantAcl,
        etablissement: iut,
      }),

      // --- Common Profiles ---
      userRepo.create({
        email: 'prof.diallo@espm.sn',
        username: profDiallo.firstName,
        password: passwordHash,
        role: Role.ENSEIGNANT,
        enseignant: profDiallo,
        photoPath: 'uploads/profiles/prof-diallo.png',
        aclRole: roleEnseignantAcl,
      }),
      userRepo.create({
        email: 'ousmane.sow@espm.sn',
        username: etudiant1.firstName,
        password: passwordHash,
        role: Role.ETUDIANT,
        etudiant: etudiant1,
        photoPath: 'uploads/profiles/ousmane-sow.png',
      }),
      // Parent avec numéro de téléphone comme identifiant
      userRepo.create({
        email: parent1.phoneNumber,
        username: parent1.firstName,
        password: passwordHash,
        role: Role.PARENT,
        parent: parent1,
      }),
    ];
    await userRepo.save(users);

    // 18. Devoirs
    const devoir1 = devoirRepo.create({
      title: 'TP Liste Chaînée',
      description: 'Implémenter une liste simplement chaînée en C.',
      deadline: new Date('2026-06-25T23:59:59Z'),
      matiere: algoFst,
      classe: informatiqueFst,
      niveau: l1Fst,
      enseignant: profDiallo,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const devoir2 = devoirRepo.create({
      title: 'Projet Base de Données',
      description: "Concevoir le schéma MCD/MLD d'une gestion de stock.",
      deadline: new Date('2026-06-30T23:59:59Z'),
      matiere: baseDonneesFst,
      classe: informatiqueFst,
      niveau: l2Fst,
      enseignant: profDiallo,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const savedDevoirs = await devoirRepo.save([devoir1, devoir2]);

    // 19. Submissions
    const docRendu = documentRepo.create({
      title: 'Rendu TP Liste Chaînée - Ousmane Sow',
      description: 'Mon code source C et le compte-rendu.',
      category: DocumentCategory.PEDAGOGIQUE,
      filePath: 'uploads/documents/rendu_tp1_ousmane.pdf',
      originalName: 'rendu_tp1_ousmane.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 150,
      etablissement: fst,
      etablissementId: fst.id,
    });
    const savedDocRendu = await documentRepo.save(docRendu);

    const submission1 = submissionRepo.create({
      devoir: savedDevoirs[0],
      etudiant: etudiant1,
      document: savedDocRendu,
      comment: "Voici mon travail pour le TP 1. J'ai ajouté les bonus.",
      etablissement: fst,
      etablissementId: fst.id,
    });
    await submissionRepo.save(submission1);

    console.log('Seeding terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du seeding :', error);
  } finally {
    await AppDataSource.destroy();
  }
}

seed();
