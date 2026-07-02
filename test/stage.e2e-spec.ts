import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Stage Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let etablissementId: number;
  let siteStageId: number;
  let periodeStageId: number;
  let etudiantId: number;
  let affectationId: number;

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

    // Setup SuperAdmin
    const passwordHash = await bcrypt.hash('password123', 10);
    await dataSource.getRepository('User').save({
      email: 'superadmin.stage@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'superadmin.stage@test.com', password: 'password123' });

    accessToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/sites-stage', () => {
    it('should create a site de stage', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sites-stage')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nom: 'Orange Sénégal',
          adresse: 'Route de Ouakam, Dakar',
          ville: 'Dakar',
          telephone: '+221 33 839 39 39',
          email: 'stage@orange.sn',
          responsable: 'M. Diallo',
          description: 'Site de test',
          capacite: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.nom).toBe('Orange Sénégal');

      siteStageId = res.body.data.id;
    });
  });

  describe('GET /api/sites-stage', () => {
    it('should list all sites', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sites-stage')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/periodes-stage', () => {
    it('should create a periode de stage', async () => {
      // First create an etablissement and annee universitaire
      const etabRes = await request(app.getHttpServer())
        .post('/api/etablissement')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Etab Stage Test', address: 'Dakar' });

      etablissementId = etabRes.body.data.id;

      const anneeRes = await request(app.getHttpServer())
        .post('/api/annee-universitaire')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          label: '2026-2027',
          startDate: '2026-10-01',
          endDate: '2027-07-31',
          isActive: true,
          etablissementId,
        });

      const anneeId = anneeRes.body.data.id;

      const res = await request(app.getHttpServer())
        .post('/api/periodes-stage')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          libelle: 'Stage de fin de cycle 2026-2027',
          dateDebut: '2026-06-01',
          dateFin: '2026-09-30',
          anneeUniversitaireId: anneeId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.libelle).toBe('Stage de fin de cycle 2026-2027');

      periodeStageId = res.body.data.id;
    });
  });

  describe('POST /api/affectations-stage', () => {
    it('should create a student and an affectation', async () => {
      // Create a classe and niveau
      const classeRes = await request(app.getHttpServer())
        .post('/api/classe')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Informatique', etablissementId });

      const classeId = classeRes.body.data.id;

      const niveauRes = await request(app.getHttpServer())
        .post('/api/niveau')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Licence 3', parcoursId: classeId });

      const niveauId = niveauRes.body.data.id;

      // Create etudiant
      const etudiantRes = await request(app.getHttpServer())
        .post('/api/etudiant')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Student',
          email: 'test.student@test.sn',
          etablissementId,
          classeId,
          niveauId,
          status: 'Actif',
        });

      etudiantId = etudiantRes.body.data.id;

      // Create affectation
      const res = await request(app.getHttpServer())
        .post('/api/affectations-stage')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          etudiantId,
          siteStageId,
          periodeStageId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.statut).toBe('EN_ATTENTE');

      affectationId = res.body.data.id;
    });

    it('should reject duplicate affectation for same etudiant + periode', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/affectations-stage')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          etudiantId,
          siteStageId,
          periodeStageId,
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/affectations-stage', () => {
    it('should list affectations with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/affectations-stage')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toBeInstanceOf(Array);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/etudiants/:id/affectations-stage', () => {
    it('should list affectations for a student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/etudiants/${etudiantId}/affectations-stage`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/affectations-stage/:id', () => {
    it('should update the statut to ACTIF', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/affectations-stage/${affectationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ statut: 'ACTIF' });

      expect(res.status).toBe(200);
      expect(res.body.data.statut).toBe('ACTIF');
    });
  });

  describe('DELETE /api/affectations-stage/:id', () => {
    it('should delete the affectation', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/affectations-stage/${affectationId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/sites-stage/:id', () => {
    it('should delete the site de stage', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/sites-stage/${siteStageId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });
  });
});
