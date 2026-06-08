import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';

describe('Presence Module (e2e)', () => {
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
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await app.close();
  });

  let etudiantId: number;
  let emploiDuTempId: number;

  it('1. Préparation des données (Etab, Classe, Etudiant, Cours)', async () => {
    // 1. Etab
    const etab = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({ name: 'Presence Etab', address: 'Test', email: 'pres@test.com', phone: '123' });
    const etabId = etab.body.data.id;

    // 2. Niveau
    const niv = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'L1 Presence' });
    const nivId = niv.body.data.id;

    // 3. Classe
    const cls = await request(app.getHttpServer())
      .post('/api/classe')
      .send({ name: 'Classe Presence', etablissementIds: [etabId], niveauIds: [nivId] });
    const clsId = cls.body.data.id;

    // 4. Parent
    const parent = await request(app.getHttpServer())
      .post('/api/parents')
      .send({ firstName: 'P', lastName: 'P', gender: 'Père', phoneNumber: '000' });
    const pId = parent.body.data.id;

    // 5. Etudiant
    const etu = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Etu',
        lastName: 'Pres',
        email: 'etu.pres@test.com',
        matricule: 'ETU-PRES-001',
        etablissementId: etabId,
        classeId: clsId,
        niveauId: nivId,
        parentIds: [pId],
      });
    etudiantId = etu.body.data.id;

    // 6. Matiere
    const mat = await request(app.getHttpServer())
      .post('/api/matiere')
      .send({ code: 'PRES101', name: 'Pres Course', coefficient: 1, classeIds: [clsId], niveauIds: [nivId] });
    const matId = mat.body.data.id;

    // 7. Enseignant & Affectation
    const ens = await request(app.getHttpServer())
      .post('/api/enseignants')
      .send({
        firstName: 'Prof',
        lastName: 'Pres',
        email: 'prof.pres@test.com',
        matricule: 'PROF-PRES-001',
        phone: '111',
        dateEmbauche: '2026-06-08',
      });
    const ensId = ens.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/enseignants/${ensId}/affectations`)
      .send({ matiereId: matId, etablissementId: etabId, niveauId: nivId });

    // 8. Emploi du Temps
    const edt = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .send({
        startTime: '2026-06-08T10:00:00.000Z',
        endTime: '2026-06-08T12:00:00.000Z',
        matiereId: matId,
        enseignantId: ensId,
        etablissementId: etabId,
        classeId: clsId,
        niveauId: nivId,
      });
    emploiDuTempId = edt.body.data.id;

    expect(etudiantId).toBeDefined();
    expect(emploiDuTempId).toBeDefined();
  });

  it('2. Enregistrer une présence (Bulk)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .send({
        emploiDuTempId,
        items: [
          { etudiantId, status: 'Présent', remark: 'À l\'heure' }
        ]
      })
      .expect(201);
    
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('Présent');
  });

  it('3. Récupérer les présences de la session', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/presence/session/${emploiDuTempId}`)
      .expect(200);
    
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].etudiant.id).toBe(etudiantId);
  });

  it('4. Consulter les stats d\'un étudiant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/presence/etudiant/${etudiantId}`)
      .expect(200);
    
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.presents).toBe(1);
  });

  it('5. Mise à jour (Re-clic) de la présence', async () => {
    await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .send({
        emploiDuTempId,
        items: [
          { etudiantId, status: 'Absent', remark: 'Parti plus tôt' }
        ]
      })
      .expect(201);

    const stats = await request(app.getHttpServer())
      .get(`/api/presence/etudiant/${etudiantId}`)
      .expect(200);
    
    expect(stats.body.data.absents).toBe(1);
    expect(stats.body.data.presents).toBe(0);
  });
});
