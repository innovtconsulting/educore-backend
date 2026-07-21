import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { PresenceStatus } from './../src/presence/entities/presence.entity';
import { SanctionType } from './../src/sanction/entities/sanction.entity';

import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Reporting Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let accessToken: string;

  let etudiantId: number;
  let edtId: number;
  const today = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dataSource = app.get(DataSource);

    // Clean state
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Setup SuperAdmin for requests
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dataSource.query(
      `INSERT INTO "user" (email, password, role) VALUES ('admin@test.com', '${hashedPassword}', '${Role.SUPER_ADMIN}')`,
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });

    accessToken = loginRes.body.data.access_token;

    // Setup basic data using direct SQL
    const etablissement = await dataSource.query(
      `INSERT INTO etablissement (name, address, email, phone) VALUES ('Etab Test Report', 'Test', 'report.test@email.sn', '123') RETURNING id`,
    );
    const etablissementId = etablissement[0].id;

    const niveau = await dataSource.query(
      `INSERT INTO niveau (name) VALUES ('L1 Report') RETURNING id`,
    );
    const niveauId = niveau[0].id;

    const classe = await dataSource.query(
      `INSERT INTO classe (name) VALUES ('Classe Report') RETURNING id`,
    );
    const classeId = classe[0].id;
    await dataSource.query(
      `INSERT INTO classe_etablissements_etablissement ("classeId", "etablissementId") VALUES (${classeId}, ${etablissementId})`,
    );
    await dataSource.query(
      `INSERT INTO classe_niveaux_niveau ("classeId", "niveauId") VALUES (${classeId}, ${niveauId})`,
    );

    const matiere = await dataSource.query(
      `INSERT INTO matiere (name, code, coefficient) VALUES ('Matiere Report', 'REP101', 2) RETURNING id`,
    );
    const matiereId = matiere[0].id;
    await dataSource.query(
      `INSERT INTO matiere_classes_classe ("matiereId", "classeId") VALUES (${matiereId}, ${classeId})`,
    );
    await dataSource.query(
      `INSERT INTO matiere_niveaux_niveau ("matiereId", "niveauId") VALUES (${matiereId}, ${niveauId})`,
    );

    const enseignant = await dataSource.query(
      `INSERT INTO enseignant ("firstName", "lastName", "email", matricule, phone, "dateEmbauche") VALUES ('Prof', 'Report', 'prof.report@email.sn', 'PROF-REP', '123', '2020-01-01') RETURNING id`,
    );
    const enseignantId = enseignant[0].id;

    await dataSource.query(
      `INSERT INTO affectation ("enseignantId", "matiereId", "etablissementId", "niveauId") VALUES (${enseignantId}, ${matiereId}, ${etablissementId}, ${niveauId})`,
    );

    const etudiant = await dataSource.query(
      `INSERT INTO etudiant ("firstName", "lastName", "email", matricule, "etablissementId", "classeId", "niveauId") VALUES ('Etu', 'Report', 'etu.report@email.sn', 'ETU-REP', ${etablissementId}, ${classeId}, ${niveauId}) RETURNING id`,
    );
    etudiantId = etudiant[0].id;

    const edt = await dataSource.query(
      `INSERT INTO emploi_du_temp ("startTime", "endTime", "matiereId", "enseignantId", "etablissementId", "classeId", "niveauId") VALUES ('${today}T08:00:00.000Z', '${today}T10:00:00.000Z', ${matiereId}, ${enseignantId}, ${etablissementId}, ${classeId}, ${niveauId}) RETURNING id`,
    );
    edtId = edt[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Génération du rapport vide', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/reporting/supervisor-daily?date=${today}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.summary.totalAbsences).toBe(0);
    expect(res.body.data.summary.totalRetards).toBe(0);
    expect(res.body.data.summary.totalSanctions).toBe(0);
  });

  it("2. Enregistrement d'une absence, un retard et une sanction", async () => {
    const etablissementId = 1;
    const classeId = 1;
    const niveauId = 1;

    const etudiant2 = await dataSource.query(
      `INSERT INTO etudiant ("firstName", "lastName", "email", matricule, "etablissementId", "classeId", "niveauId") VALUES ('Etu2', 'Report', 'etu2.report@email.sn', 'ETU-REP2', ${etablissementId}, ${classeId}, ${niveauId}) RETURNING id`,
    );
    const etudiant2Id = etudiant2[0].id;

    // Absence pour Etudiant 1
    await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        emploiDuTempId: edtId,
        items: [
          { etudiantId, status: PresenceStatus.ABSENT, remark: 'Malade' },
        ],
      })
      .expect(201);

    // Retard pour Etudiant 2
    await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        emploiDuTempId: edtId,
        items: [
          {
            etudiantId: etudiant2Id,
            status: PresenceStatus.RETARD,
            remark: 'Transport',
          },
        ],
      })
      .expect(201);

    // Sanction pour Etudiant 1
    await request(app.getHttpServer())
      .post('/api/sanctions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        etudiantId,
        type: SanctionType.AVERTISSEMENT,
        motif: 'Absence injustifiée',
        dateDecision: today,
      })
      .expect(201);
  });

  it('3. Vérification du rapport quotidien complet', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/reporting/supervisor-daily?date=${today}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.summary.totalAbsences).toBe(1);
    expect(res.body.data.summary.totalRetards).toBe(1);
    expect(res.body.data.summary.totalSanctions).toBe(1);

    expect(res.body.data.absences[0].remarque).toBe('Malade');
    expect(res.body.data.retards[0].remarque).toBe('Transport');
    expect(res.body.data.sanctions[0].motif).toBe('Absence injustifiée');
  });

  it('4. Soumission du rapport quotidien', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reporting/submit-daily')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        date: today,
        supervisorName: 'Surveillant Test',
        observations: "Tout est en ordre pour aujourd'hui",
      })
      .expect(201);

    expect(res.body.data.isSubmitted).toBe(true);
    expect(res.body.data.supervisorName).toBe('Surveillant Test');
    expect(res.body.data.totalAbsences).toBe(1);
    expect(res.body.data.pdfUrl).toBeDefined();
    expect(res.body.data.pdfUrl).toContain(
      'uploads/documents/rapport_quotidien',
    );
  });

  it('5. Récupération du lien PDF', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/reporting/daily-reports')
      .set('Authorization', `Bearer ${accessToken}`);
    const reportId = listRes.body.data.items[0].id;

    const res = await request(app.getHttpServer())
      .get(`/api/reporting/daily-report/${reportId}/pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.pdfUrl).toBeDefined();
    expect(res.body.data.pdfUrl).toContain(
      '/uploads/documents/rapport_quotidien',
    );
  });

  it("6. Récupération de la liste des rapports pour l'admin", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reporting/daily-reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].date).toBe(today);
  });

  it("7. Récupération d'un rapport par ID", async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/reporting/daily-reports')
      .set('Authorization', `Bearer ${accessToken}`);
    const reportId = listRes.body.data.items[0].id;

    const res = await request(app.getHttpServer())
      .get(`/api/reporting/daily-report/${reportId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(reportId);
    expect(res.body.data.supervisorName).toBe('Surveillant Test');
  });
});
