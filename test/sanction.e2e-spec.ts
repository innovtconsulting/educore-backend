import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { SanctionType } from './../src/sanction/entities/sanction.entity';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Sanction Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let accessToken: string;

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
      email: 'superadmin@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'superadmin@test.com', password: 'password123' });

    accessToken = loginRes.body.data.access_token;

    // Setup: Create Etablissement, Niveau, Classe, Parent, then Etudiant
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Etab Test Sanction',
        address: 'Test',
        email: 'sanction.test@email.sn',
        phone: '123456789',
      });
    const etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Niveau Test Sanction' });
    const niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Classe Test Sanction',
        etablissementIds: [etablissementId],
        niveauIds: [niveauId],
      });
    const classeId = classe.body.data.id;

    const etudiant = await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Etudiant',
        lastName: 'Sanctionné',
        email: 'sanctionne@email.sn',
        matricule: 'ETU-SANC-001',
        etablissementId,
        classeId,
        niveauId,
        parentsData: [
          {
            firstName: 'Parent',
            lastName: 'Sanction',
            gender: 'Tuteur',
            phoneNumber: '001',
          },
        ],
      });
    etudiantId = etudiant.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let sanctionId: number;

  it("1. Création d'une sanction (Succès)", async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sanctions')
      .set('Authorization', `Bearer ${accessToken}`)
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
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it("3. Récupération des sanctions d'un étudiant", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/sanctions/etudiant/${etudiantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].etudiant.id).toBe(etudiantId);
  });

  it("4. Mise à jour d'une sanction", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/sanctions/${sanctionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        motif: 'Retards répétés et absentéisme',
        type: SanctionType.BLAME,
      })
      .expect(200);

    expect(res.body.data.motif).toBe('Retards répétés et absentéisme');
    expect(res.body.data.type).toBe(SanctionType.BLAME);
  });

  it("5. Suppression d'une sanction", async () => {
    await request(app.getHttpServer())
      .delete(`/api/sanctions/${sanctionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/sanctions/${sanctionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
