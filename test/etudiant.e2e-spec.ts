import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

describe('Student Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let etablissementId: number;
  let classeId: number;
  let niveauId: number;
  let parentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dataSource = app.get(DataSource);

    // Créer les relations nécessaires pour les tests
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({
        name: 'Etab Test Etudiant',
        address: 'Test',
        email: 'etudiant.test@email.sn',
        phone: '123456789',
      });
    etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'Niveau Test Etudiant' });
    niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .send({
        name: 'Classe Test Etudiant',
        etablissementIds: [etablissementId],
        niveauIds: [niveauId],
      });
    classeId = classe.body.data.id;

    const parent = await request(app.getHttpServer())
      .post('/api/parents')
      .send({
        firstName: 'Parent',
        lastName: 'Test',
        gender: 'Tuteur',
        phoneNumber: '000',
      });
    parentId = parent.body.data.id;
  });

  afterAll(async () => {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await app.close();
  });

  let etudiantId: number;

  it('1. Création d\'un étudiant (Succès)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Test',
        lastName: 'Etudiant',
        email: 'test.etudiant@email.sn',
        matricule: 'ETU-TEST-001',
        etablissementId,
        classeId,
        niveauId,
        parentIds: [parentId],
      })
      .expect(201);
    
    etudiantId = res.body.data.id;
    expect(etudiantId).toBeDefined();
    expect(res.body.data.status).toBe('Actif');
  });

  it('2. ÉCHEC : Création d\'un étudiant avec matricule existant', async () => {
    await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Autre',
        lastName: 'Etudiant',
        email: 'autre@email.sn',
        matricule: 'ETU-TEST-001',
        etablissementId,
        classeId,
        niveauId,
        parentIds: [parentId],
      })
      .expect(400);
  });

  it('3. Mise à jour du statut (Admin)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/etudiants/${etudiantId}`)
      .send({
        status: 'Suspendu',
      })
      .expect(200);
    
    expect(res.body.data.status).toBe('Suspendu');
  });

  it('4. Récupération avec relations', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/etudiants/${etudiantId}`)
      .expect(200);
    
    expect(res.body.data.etablissement).toBeDefined();
    expect(res.body.data.classe).toBeDefined();
    expect(res.body.data.niveau).toBeDefined();
  });
});
