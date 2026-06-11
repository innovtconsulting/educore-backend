import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { PresenceStatus } from './../src/presence/entities/presence.entity';
import { SanctionType } from './../src/sanction/entities/sanction.entity';

describe('Reporting Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

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
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    // Setup
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({ name: 'Etab Test Report', address: 'Test', email: 'report.test@email.sn', phone: '123' })
      .expect(201);
    const etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'L1 Report' })
      .expect(201);
    const niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .send({ name: 'Classe Report', etablissementIds: [etablissementId], niveauIds: [niveauId] })
      .expect(201);
    const classeId = classe.body.data.id;

    const matiere = await request(app.getHttpServer())
      .post('/api/matiere')
      .send({ name: 'Matiere Report', code: 'REP101', coefficient: 2, classeIds: [classeId], niveauIds: [niveauId] })
      .expect(201);
    const matiereId = matiere.body.data.id;

    const enseignant = await request(app.getHttpServer())
      .post('/api/enseignants')
      .send({ firstName: 'Prof', lastName: 'Report', email: 'prof.report@email.sn', matricule: 'PROF-REP', phone: '123', dateEmbauche: '2020-01-01' })
      .expect(201);
    const enseignantId = enseignant.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/enseignants/${enseignantId}/affectations`)
      .send({ matiereId, etablissementId, niveauId })
      .expect(201);

    const parent = await request(app.getHttpServer())
      .post('/api/parents')
      .send({ firstName: 'Parent', lastName: 'Report', gender: 'Tuteur', phoneNumber: '003' })
      .expect(201);
    const parentId = parent.body.data.id;

    const etudiant = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Etu', lastName: 'Report', email: 'etu.report@email.sn', matricule: 'ETU-REP',
        etablissementId, classeId, niveauId, parentIds: [parentId]
      })
      .expect(201);
    etudiantId = etudiant.body.data.id;

    const edt = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .send({
        startTime: `${today}T08:00:00.000Z`,
        endTime: `${today}T10:00:00.000Z`,
        matiereId, enseignantId, etablissementId, classeId, niveauId
      })
      .expect(201);
    edtId = edt.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Génération du rapport vide', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/reporting/supervisor-daily?date=${today}`)
      .expect(200);
    
    expect(res.body.data.summary.totalAbsences).toBe(0);
    expect(res.body.data.summary.totalRetards).toBe(0);
    expect(res.body.data.summary.totalSanctions).toBe(0);
  });

  it('2. Enregistrement d\'une absence, un retard et une sanction', async () => {
    const parent2 = await request(app.getHttpServer())
      .post('/api/parents')
      .send({ firstName: 'Parent2', lastName: 'Report', gender: 'Tuteur', phoneNumber: '004' })
      .expect(201);
    
    const etudiant2 = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Etu2', lastName: 'Report', email: 'etu2.report@email.sn', matricule: 'ETU-REP2',
        etablissementId: 1, classeId: 1, niveauId: 1, parentIds: [parent2.body.data.id]
      })
      .expect(201);

    // Absence pour Etudiant 1
    await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .send({
        emploiDuTempId: edtId,
        items: [{ etudiantId, status: PresenceStatus.ABSENT, remark: 'Malade' }]
      })
      .expect(201);

    // Retard pour Etudiant 2
    await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .send({
        emploiDuTempId: edtId,
        items: [{ etudiantId: etudiant2.body.data.id, status: PresenceStatus.RETARD, remark: 'Transport' }]
      })
      .expect(201);

    // Sanction pour Etudiant 1
    await request(app.getHttpServer())
      .post('/api/sanctions')
      .send({
        etudiantId,
        type: SanctionType.AVERTISSEMENT,
        motif: 'Absence injustifiée',
        dateDecision: today
      })
      .expect(201);
  });

  it('3. Vérification du rapport quotidien complet', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/reporting/supervisor-daily?date=${today}`)
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
      .send({
        date: today,
        supervisorName: 'Surveillant Test',
        observations: 'Tout est en ordre pour aujourd\'hui'
      })
      .expect(201);
    
    expect(res.body.data.isSubmitted).toBe(true);
    expect(res.body.data.supervisorName).toBe('Surveillant Test');
    expect(res.body.data.totalAbsences).toBe(1);
  });

  it('5. Récupération de la liste des rapports pour l\'admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reporting/daily-reports')
      .expect(200);
    
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].date).toBe(today);
  });

  it('6. Récupération d\'un rapport par ID', async () => {
    const listRes = await request(app.getHttpServer()).get('/api/reporting/daily-reports');
    const reportId = listRes.body.data.items[0].id;

    const res = await request(app.getHttpServer())
      .get(`/api/reporting/daily-report/${reportId}`)
      .expect(200);
    
    expect(res.body.data.id).toBe(reportId);
    expect(res.body.data.supervisorName).toBe('Surveillant Test');
  });
});
