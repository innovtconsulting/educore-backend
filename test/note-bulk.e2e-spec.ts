import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/user/entities/user.entity';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

describe('Note Bulk Entry (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let teacherToken: string;
  let etudiant1Id: number;
  let etudiant2Id: number;
  let evaluationId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    // Nettoyage complet
    await dataSource.query('TRUNCATE "user", "enseignant", "affectation", "etudiant", "matiere", "niveau", "classe", "etablissement", "evaluation", "note", "semestre", "annee_universitaire" CASCADE');

    // 1. Setup environnement
    const etablissement = await dataSource.query(`INSERT INTO etablissement (name, address, email) VALUES ('ESPM Bulk', 'Dakar', 'bulk@espm.sn') RETURNING id`);
    const etablissementId = etablissement[0].id;

    const niveau = await dataSource.query(`INSERT INTO niveau (name) VALUES ('L1 Bulk') RETURNING id`);
    const niveauId = niveau[0].id;

    const classe = await dataSource.query(`INSERT INTO classe (name) VALUES ('Informatique Bulk') RETURNING id`);
    const classeId = classe[0].id;
    await dataSource.query(`INSERT INTO classe_etablissements_etablissement ("classeId", "etablissementId") VALUES (${classeId}, ${etablissementId})`);
    await dataSource.query(`INSERT INTO classe_niveaux_niveau ("classeId", "niveauId") VALUES (${classeId}, ${niveauId})`);

    const matiere = await dataSource.query(`INSERT INTO matiere (name, code, coefficient) VALUES ('Algorithmique Bulk', 'ALG_BULK', 3) RETURNING id`);
    const matiereId = matiere[0].id;
    await dataSource.query(`INSERT INTO matiere_classes_classe ("matiereId", "classeId") VALUES (${matiereId}, ${classeId})`);
    await dataSource.query(`INSERT INTO matiere_niveaux_niveau ("matiereId", "niveauId") VALUES (${matiereId}, ${niveauId})`);

    const enseignant = await dataSource.query(`INSERT INTO enseignant ("firstName", "lastName", "email", "matricule", "dateEmbauche") VALUES ('Prof', 'Bulk', 'prof.bulk@test.com', 'ENS_BULK', NOW()) RETURNING id`);
    const enseignantId = enseignant[0].id;

    // AFFECTATION cruciale pour le rôle ENSEIGNANT
    await dataSource.query(`INSERT INTO affectation ("enseignantId", "matiereId", "etablissementId", "niveauId") VALUES (${enseignantId}, ${matiereId}, ${etablissementId}, ${niveauId})`);

    const etudiant1 = await dataSource.query(`INSERT INTO etudiant ("firstName", "lastName", "email", "matricule", "etablissementId", "classeId", "niveauId") VALUES ('Etudiant', '1', 'et1@test.com', 'MAT_B1', ${etablissementId}, ${classeId}, ${niveauId}) RETURNING id`);
    etudiant1Id = etudiant1[0].id;
    const etudiant2 = await dataSource.query(`INSERT INTO etudiant ("firstName", "lastName", "email", "matricule", "etablissementId", "classeId", "niveauId") VALUES ('Etudiant', '2', 'et2@test.com', 'MAT_B2', ${etablissementId}, ${classeId}, ${niveauId}) RETURNING id`);
    etudiant2Id = etudiant2[0].id;

    const annee = await dataSource.query(`INSERT INTO annee_universitaire (label, "startDate", "endDate") VALUES ('2025-2026', '2025-10-01', '2026-07-31') RETURNING id`);
    const semestre = await dataSource.query(`INSERT INTO semestre (name, "startDate", "endDate", "anneeUniversitaireId") VALUES ('S1 Bulk', '2025-10-01', '2026-02-28', ${annee[0].id}) RETURNING id`);

    const evaluation = await dataSource.query(`INSERT INTO evaluation (title, type, date, "matiereId", "classeId", "niveauId", "semestreId") VALUES ('CC1 Bulk', 'Contrôle Continu', NOW(), ${matiereId}, ${classeId}, ${niveauId}, ${semestre[0].id}) RETURNING id`);
    evaluationId = evaluation[0].id;

    // 2. Créer Utilisateur Enseignant
    const hashedPassword = await bcrypt.hash('password123', 10);
    await dataSource.query(`INSERT INTO "user" (email, password, role, "enseignantId") VALUES ('prof.bulk@test.com', '${hashedPassword}', 'Enseignant', ${enseignantId})`);

    // 3. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'prof.bulk@test.com', password: 'password123' });
    
    // Support potential TransformInterceptor
    if (loginRes.body.data && loginRes.body.data.access_token) {
      teacherToken = loginRes.body.data.access_token;
    } else {
      teacherToken = loginRes.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('/note/bulk (POST) - Enseignant saisi les notes en masse pour sa matière', async () => {
    const bulkData = {
      evaluationId: evaluationId,
      items: [
        { etudiantId: etudiant1Id, value: 15.5, remark: 'Excellent' },
        { etudiantId: etudiant2Id, value: 12, remark: 'Bien' }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/note/bulk')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(bulkData)
      .expect(201);

    const notesData = res.body.data || res.body;

    expect(notesData.length).toBe(2);
    expect(Number(notesData[0].value)).toBe(15.5);
    expect(Number(notesData[1].value)).toBe(12);

    // Vérifier en base
    const notes = await dataSource.query(`SELECT * FROM note WHERE "evaluationId" = ${evaluationId}`);
    expect(notes.length).toBe(2);
  });

  it('/note/bulk (POST) - Ne doit pas permettre de saisir pour une évaluation hors affectation', async () => {
    // Créer une autre évaluation pour une matière non affectée
    const matiere2 = await dataSource.query(`INSERT INTO matiere (name, code, coefficient) VALUES ('Matière Interdite', 'FORBIDDEN', 2) RETURNING id`);
    const annee = await dataSource.query(`SELECT id FROM annee_universitaire LIMIT 1`);
    const semestre = await dataSource.query(`SELECT id FROM semestre LIMIT 1`);
    const etablissement = await dataSource.query(`SELECT id FROM etablissement LIMIT 1`);
    const classe = await dataSource.query(`SELECT id FROM classe LIMIT 1`);
    const niveau = await dataSource.query(`SELECT id FROM niveau LIMIT 1`);

    const evalForbidden = await dataSource.query(`INSERT INTO evaluation (title, type, date, "matiereId", "classeId", "niveauId", "semestreId") VALUES ('CC Interdit', 'Contrôle Continu', NOW(), ${matiere2[0].id}, ${classe[0].id}, ${niveau[0].id}, ${semestre[0].id}) RETURNING id`);

    const bulkData = {
      evaluationId: evalForbidden[0].id,
      items: [{ etudiantId: etudiant1Id, value: 10 }]
    };

    await request(app.getHttpServer())
      .post('/note/bulk')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(bulkData)
      .expect(403);
  });
});
