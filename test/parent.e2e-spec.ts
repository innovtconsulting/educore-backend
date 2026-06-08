import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

describe('Parent Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
  });

  afterAll(async () => {
    // Clean up
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await app.close();
  });

  let parentId: number;
  let etudiantId: number;

  it('1. Création d\'un parent', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/parents')
      .send({
        firstName: 'Jean',
        lastName: 'Dupont',
        gender: 'Père',
        email: 'jean.dupont@email.com',
        phoneNumber: '+221 77 123 45 67',
        job: 'Ingénieur',
      })
      .expect(201);
    
    parentId = res.body.data.id;
    expect(parentId).toBeDefined();
    expect(res.body.data.firstName).toBe('Jean');
  });

  it('2. Création d\'un étudiant avec le parent', async () => {
    // Create relations first
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({ name: 'Etab Test', address: 'Test', email: 'etab@test.com', phone: '123' });
    
    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'Niveau Test' });

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .send({
        name: 'Classe Test',
        etablissementIds: [etablissement.body.data.id],
        niveauIds: [niveau.body.data.id],
      });

    const res = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Fils',
        lastName: 'Dupont',
        email: 'fils.dupont@email.sn',
        matricule: 'ETU-PARENT-001',
        etablissementId: etablissement.body.data.id,
        classeId: classe.body.data.id,
        niveauId: niveau.body.data.id,
        parentIds: [parentId],
      })
      .expect(201);
    
    etudiantId = res.body.data.id;
    expect(res.body.data.parents).toHaveLength(1);
    expect(res.body.data.parents[0].id).toBe(parentId);
  });

  it('2.1. ÉCHEC : Création d\'un étudiant sans parent', async () => {
    const etablissement = await request(app.getHttpServer()).get('/api/etablissement');
    const niveau = await request(app.getHttpServer()).get('/api/niveau');
    const classe = await request(app.getHttpServer()).get('/api/classe');

    await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Fils',
        lastName: 'SansParent',
        email: 'sans.parent@email.sn',
        matricule: 'ETU-SANS-001',
        etablissementId: etablissement.body.data[0].id,
        classeId: classe.body.data[0].id,
        niveauId: niveau.body.data[0].id,
        parentIds: [],
      })
      .expect(400);
  });

  it('2.2. ÉCHEC : Création avec 2 pères', async () => {
    const resP2 = await request(app.getHttpServer())
      .post('/api/parents')
      .send({
        firstName: 'Marc',
        lastName: 'Dupont',
        gender: 'Père',
        phoneNumber: '000',
      });
    const p2Id = resP2.body.data.id;

    const etablissement = await request(app.getHttpServer()).get('/api/etablissement');
    const niveau = await request(app.getHttpServer()).get('/api/niveau');
    const classe = await request(app.getHttpServer()).get('/api/classe');

    await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Fils',
        lastName: 'DeuxPeres',
        email: 'deux.peres@email.sn',
        matricule: 'ETU-PERES-001',
        etablissementId: etablissement.body.data[0].id,
        classeId: classe.body.data[0].id,
        niveauId: niveau.body.data[0].id,
        parentIds: [parentId, p2Id],
      })
      .expect(400);
  });

  it('3. Vérification de la relation depuis le parent', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/parents/${parentId}`)
      .expect(200);
    
    expect(res.body.data.etudiants).toHaveLength(1);
    expect(res.body.data.etudiants[0].id).toBe(etudiantId);
  });

  it('3.1. Liste des contacts avec recherche', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/parents/contacts?search=Dupont')
      .expect(200);
    
    // Il y a 2 Dupont (Jean et Marc) suite aux tests précédents
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].phoneNumber).toBeDefined();
    expect(res.body.data[0].etudiants).toBeDefined();
  });

  it('4. Mise à jour du parent', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/parents/${parentId}`)
      .send({ job: 'Directeur' })
      .expect(200);
    
    expect(res.body.data.job).toBe('Directeur');
  });

  it('5. Suppression du parent', async () => {
    await request(app.getHttpServer())
      .delete(`/api/parents/${parentId}`)
      .expect(200);
    
    await request(app.getHttpServer())
      .get(`/api/parents/${parentId}`)
      .expect(404);
  });
});
