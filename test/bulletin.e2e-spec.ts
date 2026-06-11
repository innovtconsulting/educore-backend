import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { EvaluationType, EvaluationSession } from './../src/evaluation/entities/evaluation.entity';

describe('Bulletin Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  let etudiantId: number;
  let semestreId: number;
  let matiereId: number;
  let classeId: number;
  let niveauId: number;

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

    // Setup basic data
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({ name: 'Etab Bulletin', address: 'Test', email: 'bull@test.com', phone: '123' });
    const etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'L1 Bulletin' });
    niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .send({ name: 'Classe Bulletin', etablissementIds: [etablissementId], niveauIds: [niveauId] });
    classeId = classe.body.data.id;

    const matiere = await request(app.getHttpServer())
      .post('/api/matiere')
      .send({ name: 'Maths Bulletin', code: 'MATH101', coefficient: 5, classeIds: [classeId], niveauIds: [niveauId] });
    matiereId = matiere.body.data.id;

    const parent = await request(app.getHttpServer())
      .post('/api/parents')
      .send({ firstName: 'P', lastName: 'P', gender: 'Père', phoneNumber: '000' });
    
    const etudiant = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Jean', lastName: 'Note', email: 'jean.note@test.com', matricule: 'JEAN-001',
        etablissementId, classeId, niveauId, parentIds: [parent.body.data.id]
      });
    etudiantId = etudiant.body.data.id;

    const annee = await request(app.getHttpServer())
      .post('/api/annee-universitaire')
      .send({ label: '2026-2027', startDate: '2026-10-01', endDate: '2027-07-31' });
    const anneeId = annee.body.data.id;

    const semestre = await request(app.getHttpServer())
      .post('/api/semestre')
      .send({ 
        name: 'S1 Test', 
        startDate: '2026-10-01', 
        endDate: '2027-02-28',
        anneeUniversitaireId: anneeId 
      });
    semestreId = semestre.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Création des évaluations et notes', async () => {
    // CC: 12/20 (coeff 0.4)
    const evalCC = await request(app.getHttpServer())
      .post('/api/evaluation')
      .send({
        title: 'CC1', type: EvaluationType.CC, weight: 0.4, date: '2026-11-01',
        matiereId, classeId, niveauId, semestreId
      });
    
    await request(app.getHttpServer())
      .post('/api/note')
      .send({ value: 12, etudiantId, evaluationId: evalCC.body.data.id });

    // Examen: 7/20 (coeff 0.6)
    // Moyenne = 12*0.4 + 7*0.6 = 4.8 + 4.2 = 9.0
    const evalExam = await request(app.getHttpServer())
      .post('/api/evaluation')
      .send({
        title: 'Exam1', type: EvaluationType.EXAMEN, weight: 0.6, date: '2027-01-15',
        matiereId, classeId, niveauId, semestreId
      });
    
    await request(app.getHttpServer())
      .post('/api/note')
      .send({ value: 7, etudiantId, evaluationId: evalExam.body.data.id });
  });

  it('2. Vérification du bulletin provisoire (Avant rattrapage)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bulletins/etudiant/${etudiantId}/semestre/${semestreId}`)
      .expect(200);
    
    expect(res.body.data.moyenneGenerale).toBe(9);
    expect(res.body.data.decisions.isAdmis).toBe(false);
  });

  it('3. Ajout d\'un rattrapage et vérification du bulletin final', async () => {
    // Rattrapage: 15/20 (coeff 0.6)
    // Nouvelle moyenne = 12*0.4 + 15*0.6 = 4.8 + 9.0 = 13.8
    const evalRatt = await request(app.getHttpServer())
      .post('/api/evaluation')
      .send({
        title: 'Ratt1', type: EvaluationType.EXAMEN, session: EvaluationSession.RATTRAPAGE, weight: 0.6, date: '2027-02-10',
        matiereId, classeId, niveauId, semestreId
      });
    
    await request(app.getHttpServer())
      .post('/api/note')
      .send({ value: 15, etudiantId, evaluationId: evalRatt.body.data.id });

    const res = await request(app.getHttpServer())
      .get(`/api/bulletins/etudiant/${etudiantId}/semestre/${semestreId}`)
      .expect(200);
    
    expect(res.body.data.moyenneGenerale).toBe(13.8);
    expect(res.body.data.decisions.isAdmis).toBe(true);
  });
});
