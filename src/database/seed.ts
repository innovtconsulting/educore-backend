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
import { Sanction, SanctionType } from '../sanction/entities/sanction.entity';
import { DailyReport } from '../reporting/entities/daily-report.entity';
import { Document, DocumentCategory } from '../document/entities/document.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Semestre } from '../semestre/entities/semestre.entity';
import { Evaluation, EvaluationSession, EvaluationType } from '../evaluation/entities/evaluation.entity';
import { Note } from '../note/entities/note.entity';
import { Frais, FeeType } from '../finance/entities/frais.entity';
import { Facture, InvoiceStatus } from '../finance/entities/facture.entity';
import { Paiement, PaymentMethod } from '../finance/entities/paiement.entity';
import { generateReceiptPdf } from '../finance/utils/pdf-generator';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  entities: [
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
    Document,
    AnneeUniversitaire,
    Semestre,
    Evaluation,
    Note,
    Frais,
    Facture,
    Paiement,
  ],
  synchronize: false,
});

async function seed() {
  try {
    await dataSource.initialize();
    console.log('Connexion établie pour le seeding...');

    const etablissementRepo = dataSource.getRepository(Etablissement);
    const niveauRepo = dataSource.getRepository(Niveau);
    const classeRepo = dataSource.getRepository(Classe);
    const matiereRepo = dataSource.getRepository(Matiere);
    const enseignantRepo = dataSource.getRepository(Enseignant);
    const affectationRepo = dataSource.getRepository(Affectation);
    const parentRepo = dataSource.getRepository(Parent);
    const etudiantRepo = dataSource.getRepository(Etudiant);
    const emploiRepo = dataSource.getRepository(EmploiDuTemp);
    const presenceRepo = dataSource.getRepository(Presence);
    const sanctionRepo = dataSource.getRepository(Sanction);
    const dailyReportRepo = dataSource.getRepository(DailyReport);
    const documentRepo = dataSource.getRepository(Document);
    const anneeRepo = dataSource.getRepository(AnneeUniversitaire);
    const semestreRepo = dataSource.getRepository(Semestre);
    const evaluationRepo = dataSource.getRepository(Evaluation);
    const noteRepo = dataSource.getRepository(Note);
    const fraisRepo = dataSource.getRepository(Frais);
    const factureRepo = dataSource.getRepository(Facture);
    const paiementRepo = dataSource.getRepository(Paiement);

    // 0. Année Universitaire
    const annee2026 = anneeRepo.create({
      label: '2026-2027',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-07-31'),
      isActive: true,
    });
    await anneeRepo.save(annee2026);

    // 1. Établissements
    const fst = etablissementRepo.create({
      name: 'Faculté des Sciences et Techniques (FST)',
      address: 'UCAD, Dakar',
      email: 'contact.fst@ucad.edu.sn',
      phone: '+221 33 825 00 00',
    });
    const esp = etablissementRepo.create({
      name: 'École Supérieure Polytechnique (ESP)',
      address: 'Avenue Cheikh Anta Diop, Dakar',
      email: 'contact.esp@ucad.edu.sn',
      phone: '+221 33 864 51 96',
    });
    await etablissementRepo.save([fst, esp]);

    // 2. Niveaux
    const l1 = niveauRepo.create({ name: 'Licence 1' });
    const l2 = niveauRepo.create({ name: 'Licence 2' });
    const l3 = niveauRepo.create({ name: 'Licence 3' });
    const m1 = niveauRepo.create({ name: 'Master 1' });
    const m2 = niveauRepo.create({ name: 'Master 2' });
    await niveauRepo.save([l1, l2, l3, m1, m2]);

    // 3. Classes
    const informatique = classeRepo.create({
      name: 'Informatique',
      niveaux: [l1, l2, l3, m1, m2],
      etablissements: [fst, esp],
    });
    const mathematiques = classeRepo.create({
      name: 'Mathématiques',
      niveaux: [l1, l2, l3],
      etablissements: [fst],
    });
    await classeRepo.save([informatique, mathematiques]);

    // 4. Matières
    const algo = matiereRepo.create({
      code: 'INF101',
      name: 'Algorithmique 1',
      coefficient: 4,
      classes: [informatique],
      niveaux: [l1],
    });
    const baseDonnees = matiereRepo.create({
      code: 'INF201',
      name: 'Bases de Données',
      coefficient: 3,
      classes: [informatique],
      niveaux: [l2],
    });
    const reseaux = matiereRepo.create({
      code: 'INF301',
      name: 'Réseaux Informatiques',
      coefficient: 3,
      classes: [informatique],
      niveaux: [l3],
    });
    await matiereRepo.save([algo, baseDonnees, reseaux]);

    // 5. Enseignants
    const profDiallo = enseignantRepo.create({
      firstName: 'Moussa',
      lastName: 'Diallo',
      email: 'moussa.diallo@ucad.edu.sn',
      matricule: 'FST-INF-001',
      dateEmbauche: new Date('2020-01-01'),
      phone: '+221 77 123 45 67',
    });
    const profSow = enseignantRepo.create({
      firstName: 'Mariam',
      lastName: 'Sow',
      email: 'mariam.sow@ucad.edu.sn',
      matricule: 'FST-MAT-001',
      dateEmbauche: new Date('2021-01-01'),
      phone: '+221 77 987 65 43',
    });
    await enseignantRepo.save([profDiallo, profSow]);

    // 6. Affectations
    const aff1 = affectationRepo.create({
      enseignant: profDiallo,
      matiere: algo,
      etablissement: fst,
      niveau: l1,
    });
    const aff2 = affectationRepo.create({
      enseignant: profDiallo,
      matiere: baseDonnees,
      etablissement: esp,
      niveau: l2,
    });
    const aff3 = affectationRepo.create({
      enseignant: profSow,
      matiere: algo,
      etablissement: fst,
      niveau: l1,
    });
    await affectationRepo.save([aff1, aff2, aff3]);

    // 7. Parents
    const parent1 = parentRepo.create({
      firstName: 'Modou',
      lastName: 'Sow',
      gender: 'Père' as any,
      phoneNumber: '+221 77 111 22 33',
      email: 'modou.sow@email.sn',
    });
    const parent2 = parentRepo.create({
      firstName: 'Awa',
      lastName: 'Sow',
      gender: 'Mère' as any,
      phoneNumber: '+221 77 444 55 66',
    });
    await parentRepo.save([parent1, parent2]);

    // 8. Étudiants
    const etudiant1 = etudiantRepo.create({
      firstName: 'Ousmane',
      lastName: 'Sow',
      email: 'ousmane.sow@email.sn',
      matricule: 'ETU-2026-001',
      etablissement: fst,
      classe: informatique,
      niveau: l1,
      parents: [parent1, parent2],
    });
    const etudiant2 = etudiantRepo.create({
      firstName: 'Fatou',
      lastName: 'Ndiaye',
      email: 'fatou.ndiaye@email.sn',
      matricule: 'ETU-2026-002',
      etablissement: esp,
      classe: informatique,
      niveau: l2,
    });
    await etudiantRepo.save([etudiant1, etudiant2]);

    // 9. Emploi du Temps
    const cours1 = emploiRepo.create({
      startTime: new Date('2026-06-08T08:00:00Z'),
      endTime: new Date('2026-06-08T10:00:00Z'),
      matiere: algo,
      enseignant: profDiallo,
      etablissement: fst,
      classe: informatique,
      niveau: l1,
    });
    await emploiRepo.save(cours1);

    // 10. Présence
    const pres1 = presenceRepo.create({
      etudiant: etudiant1,
      emploiDuTemp: cours1,
      status: 'Présent' as any,
      remark: 'À l\'heure',
    });
    await presenceRepo.save(pres1);

    // 11. Sanctions
    const sanc1 = sanctionRepo.create({
      etudiant: etudiant1,
      type: SanctionType.AVERTISSEMENT,
      motif: 'Retards répétés au cours d\'Algorithmique',
      dateDecision: new Date('2026-06-09'),
      isApplied: true,
    });
    await sanctionRepo.save(sanc1);

    // 12. Finance
    const fraisL1 = fraisRepo.create({
      name: 'Scolarité Licence 1 Informatique',
      amount: 500000,
      type: FeeType.SCOLARITE,
      classe: informatique,
      niveau: l1,
    });
    const fraisInscr = fraisRepo.create({
      name: 'Frais d\'inscription L1',
      amount: 50000,
      type: FeeType.INSCRIPTION,
      classe: informatique,
      niveau: l1,
    });
    await fraisRepo.save([fraisL1, fraisInscr]);

    const fac1 = factureRepo.create({
      numero: 'FAC-2026-0001',
      etudiant: etudiant1,
      dateEmission: new Date('2026-06-01'),
      dateEcheance: new Date('2026-07-01'),
      montantTotal: 550000,
      status: InvoiceStatus.PARTIEL,
    });
    const fac2 = factureRepo.create({
      numero: 'FAC-2026-0002',
      etudiant: etudiant2,
      dateEmission: new Date('2026-06-10'),
      dateEcheance: new Date('2026-07-10'),
      montantTotal: 600000,
      status: InvoiceStatus.VALIDE,
    });
    await factureRepo.save([fac1, fac2]);

    const pay1 = paiementRepo.create({
      reference: 'PAY-2026-0001',
      etudiant: etudiant1,
      facture: fac1,
      montant: 250000,
      datePaiement: new Date('2026-06-05'),
      modePaiement: PaymentMethod.WAVE,
    });
    const savedPay1 = await paiementRepo.save(pay1);
    
    // Générer le reçu PDF pour le seed
    try {
      const recuPath = await generateReceiptPdf(savedPay1);
      savedPay1.recuPath = recuPath;
      await paiementRepo.save(savedPay1);
    } catch (e) {
      console.warn('Échec génération PDF dans le seed');
    }

    // 13. Rapport Quotidien
    const dailyReport = dailyReportRepo.create({
      date: '2026-06-09',
      supervisorName: 'M. Faye',
      observations: 'Journée calme, quelques retards signalés en début de matinée.',
      totalAbsences: 0,
      totalRetards: 0,
      totalSanctions: 1,
      isSubmitted: true,
    });
    await dailyReportRepo.save(dailyReport);

    // 14. Document
    const doc1 = documentRepo.create({
      title: 'Calendrier Académique 2026-2027',
      description: 'Calendrier officiel des cours et examens',
      category: DocumentCategory.ADMINISTRATIF,
      filePath: 'uploads/documents/calendrier_2026.pdf',
      originalName: 'calendrier_2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 500, // 500 KB
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
      matiere: algo,
      classe: informatique,
      niveau: l1,
      semestre: semestre1,
    });
    const evalExam = evaluationRepo.create({
      title: 'Examen Final Algorithmique',
      type: EvaluationType.EXAMEN,
      session: EvaluationSession.NORMALE,
      weight: 0.6,
      date: new Date('2027-01-20'),
      matiere: algo,
      classe: informatique,
      niveau: l1,
      semestre: semestre1,
    });
    await evaluationRepo.save([evalCC, evalExam]);

    const noteCC = noteRepo.create({
      value: 12.5,
      etudiant: etudiant1,
      evaluation: evalCC,
    });
    const noteExam = noteRepo.create({
      value: 8.0, // Moyenne matière (12.5*0.4 + 8*0.6) = 5+4.8 = 9.8 (<10)
      etudiant: etudiant1,
      evaluation: evalExam,
    });
    await noteRepo.save([noteCC, noteExam]);

    // Ajout d'une session de rattrapage
    const evalRattrapage = evaluationRepo.create({
      title: 'Rattrapage Algorithmique',
      type: EvaluationType.EXAMEN,
      session: EvaluationSession.RATTRAPAGE,
      weight: 0.6,
      date: new Date('2027-02-15'),
      matiere: algo,
      classe: informatique,
      niveau: l1,
      semestre: semestre1,
    });
    await evaluationRepo.save(evalRattrapage);

    const noteRattrapage = noteRepo.create({
      value: 14.0, // Nouvelle moyenne (12.5*0.4 + 14*0.6) = 5+8.4 = 13.4 (>10)
      etudiant: etudiant1,
      evaluation: evalRattrapage,
    });
    await noteRepo.save(noteRattrapage);

    console.log('Seeding terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du seeding :', error);
  } finally {
    await dataSource.destroy();
  }
}

seed();
