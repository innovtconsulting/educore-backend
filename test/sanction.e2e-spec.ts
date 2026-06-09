import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { SanctionType } from './../src/sanction/entities/sanction.entity';

describe('Sanction Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  let etudiantId: number;

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

    // Setup: Create Etablissement, Niveau, Classe, Parent, then Etudiant
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({
        name: 'Etab Test Sanction',
        address: 'Test',
        email: 'sanction.test@email.sn',
        phone: '123456789',
      });
    const etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'Niveau Test Sanction' });
    const niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .send({
        name: 'Classe Test Sanction',
        etablissementIds: [etablissementId],
        niveauIds: [niveauId],
      });
    const classeId = classe.body.data.id;

    const parent = await request(app.getHttpServer())
      .post('/api/parents')
      .send({
        firstName: 'Parent',
        lastName: 'Sanction',
        gender: 'Tuteur',
        phoneNumber: '001',
      });
    const parentId = parent.body.data.id;

    const etudiant = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Etudiant',
        lastName: 'Sanctionné',
        email: 'sanctionne@email.sn',
        matricule: 'ETU-SANC-001',
        etablissementId,
        classeId,
        niveauId,
        parentIds: [parentId],
      });
    etudiantId = etudiant.body.data.id;
  });

  afterAll(async () => {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await app.close();
  });

  let sanctionId: number;

  it('1. Création d\'une sanction (Succès)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sanctions')
      .send({
        etudiantId,
        type: SanctionType.AVERTISSEMENT,
        motif: 'Retards répétés',
        dateDecision: '2026-06-09',
      })
      .expect(201);
    
    sanctionId = res.body.data.id;
    expect(sanctionId).toBeDefined();
    expect(res.body.data.motif).toBe('Retards répétés');
    expect(res.body.data.etudiant.id).toBe(etudiantId);
  });

  it('2. Récupération de toutes les sanctions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sanctions')
      .expect(200);
    
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('3. Récupération des sanctions d\'un étudiant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/sanctions/etudiant/${etudiantId}`)
      .expect(200);
    
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].etudiant.id).toBe(etudiantId);
  });

  it('4. Mise à jour d\'une sanction', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/sanctions/${sanctionId}`)
      .send({
        motif: 'Retards répétés et absentéisme',
        type: SanctionType.BLAME,
      })
      .expect(200);
    
    expect(res.body.data.motif).toBe('Retards répétés et absentéisme');
    expect(res.body.data.type).toBe(SanctionType.BLAME);
  });

  it('5. Suppression d\'une sanction', async () => {
    await request(app.getHttpServer())
      .delete(`/api/sanctions/${sanctionId}`)
      .expect(200);
    
    await request(app.getHttpServer())
      .get(`/api/sanctions/${sanctionId}`)
      .expect(404);
  });
});
