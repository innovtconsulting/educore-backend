import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { EvaluationType, EvaluationSession } from './../src/evaluation/entities/evaluation.entity';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Bulletin Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let accessToken: string;

  let etudiantId: number;
  let semestreId: number;
  let matiereId: number;
  let classeId: number;
  let niveauId: number;
  let etablissementId: number;

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
    await dataSource.query('TRUNCATE "user", "parent", "etudiant", "classe", "niveau", "etablissement", "matiere", "evaluation", "note", "annee_universitaire", "semestre" RESTART IDENTITY CASCADE;');

    // Setup SuperAdmin for requests
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dataSource.query(`INSERT INTO "user" (email, password, role) VALUES ('admin@test.com', '${hashedPassword}', '${Role.SUPER_ADMIN}')`);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    
    // Check if login was successful and handle TransformInterceptor wrapping
    if (loginRes.body.data && loginRes.body.data.access_token) {
      accessToken = loginRes.body.data.access_token;
    } else {
      accessToken = loginRes.body.access_token; // Fallback
    }

    // Setup basic data using direct SQL
    const etablissement = await dataSource.query(`INSERT INTO etablissement (name, address, email) VALUES ('Etab Bulletin', 'Test', 'bull@test.com') RETURNING id`);
    etablissementId = etablissement[0].id;

    const niveau = await dataSource.query(`INSERT INTO niveau (name) VALUES ('L1 Bulletin') RETURNING id`);
    niveauId = niveau[0].id;

    const classe = await dataSource.query(`INSERT INTO classe (name) VALUES ('Classe Bulletin') RETURNING id`);
    classeId = classe[0].id;
    await dataSource.query(`INSERT INTO classe_etablissements_etablissement ("classeId", "etablissementId") VALUES (${classeId}, ${etablissementId})`);
    await dataSource.query(`INSERT INTO classe_niveaux_niveau ("classeId", "niveauId") VALUES (${classeId}, ${niveauId})`);

    const matiere = await dataSource.query(`INSERT INTO matiere (name, code, coefficient) VALUES ('Maths Bulletin', 'MATH101', 5) RETURNING id`);
    matiereId = matiere[0].id;
    await dataSource.query(`INSERT INTO matiere_classes_classe ("matiereId", "classeId") VALUES (${matiereId}, ${classeId})`);
    await dataSource.query(`INSERT INTO matiere_niveaux_niveau ("matiereId", "niveauId") VALUES (${matiereId}, ${niveauId})`);

    const parent = await dataSource.query(`INSERT INTO parent ("firstName", "lastName", "email", "phoneNumber", "gender") VALUES ('P', 'P', 'parent@test.com', '000', 'Père') RETURNING id`);
    
    const etudiant = await dataSource.query(`INSERT INTO etudiant ("firstName", "lastName", "email", "matricule", "etablissementId", "classeId", "niveauId") VALUES ('Jean', 'Note', 'jean.note@test.com', 'JEAN-001', ${etablissementId}, ${classeId}, ${niveauId}) RETURNING id`);
    etudiantId = etudiant[0].id;
    await dataSource.query(`INSERT INTO etudiant_parents_parent ("etudiantId", "parentId") VALUES (${etudiantId}, ${parent[0].id})`);

    const annee = await dataSource.query(`INSERT INTO annee_universitaire (label, "startDate", "endDate") VALUES ('2026-2027', '2026-10-01', '2027-07-31') RETURNING id`);
    const anneeId = annee[0].id;

    const semestre = await dataSource.query(`INSERT INTO semestre (name, "startDate", "endDate", "anneeUniversitaireId") VALUES ('S1 Test', '2026-10-01', '2027-02-28', ${anneeId}) RETURNING id`);
    semestreId = semestre[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Création des évaluations et notes', async () => {
    // CC: 12/20 (coeff 0.4)
    const evalCC = await request(app.getHttpServer())
      .post('/api/evaluation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'CC1', type: EvaluationType.CC, weight: 0.4, date: '2026-11-01',
        matiereId, classeId, niveauId, semestreId
      });
    
    expect(evalCC.status).toBe(201);
    
    const noteCC = await request(app.getHttpServer())
      .post('/api/note')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 12, etudiantId, evaluationId: evalCC.body.data.id });
    
    expect(noteCC.status).toBe(201);

    // Examen: 7/20 (coeff 0.6)
    // Moyenne = 12*0.4 + 7*0.6 = 4.8 + 4.2 = 9.0
    const evalExam = await request(app.getHttpServer())
      .post('/api/evaluation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Exam1', type: EvaluationType.EXAMEN, weight: 0.6, date: '2027-01-15',
        matiereId, classeId, niveauId, semestreId
      });
    
    expect(evalExam.status).toBe(201);
    
    const noteExam = await request(app.getHttpServer())
      .post('/api/note')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 7, etudiantId, evaluationId: evalExam.body.data.id });
    
    expect(noteExam.status).toBe(201);
  });

  it('2. Vérification du bulletin provisoire (Avant rattrapage)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bulletins/etudiant/${etudiantId}/semestre/${semestreId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    
    expect(res.body.data.moyenneGenerale).toBe(9);
    expect(res.body.data.decisions.isAdmis).toBe(false);
  });

  it('3. Ajout d\'un rattrapage et vérification du bulletin final', async () => {
    // Rattrapage: 15/20 (coeff 0.6)
    // Nouvelle moyenne = 12*0.4 + 15*0.6 = 4.8 + 9.0 = 13.8
    const evalRatt = await request(app.getHttpServer())
      .post('/api/evaluation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Ratt1', type: EvaluationType.EXAMEN, session: EvaluationSession.RATTRAPAGE, weight: 0.6, date: '2027-02-10',
        matiereId, classeId, niveauId, semestreId
      });
    
    expect(evalRatt.status).toBe(201);
    
    const noteRatt = await request(app.getHttpServer())
      .post('/api/note')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 15, etudiantId, evaluationId: evalRatt.body.data.id });
    
    expect(noteRatt.status).toBe(201);

    const res = await request(app.getHttpServer())
      .get(`/api/bulletins/etudiant/${etudiantId}/semestre/${semestreId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    
    expect(res.body.data.moyenneGenerale).toBe(13.8);
    expect(res.body.data.decisions.isAdmis).toBe(true);
  });

  it('4. Exportation du bulletin en PDF', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/bulletins/etudiant/${etudiantId}/semestre/${semestreId}/pdf`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    
    expect(res.header['content-type']).toBe('application/pdf');
  });
});
