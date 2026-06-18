import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Certificate Module (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let etudiantId: number;

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

    // Setup SuperAdmin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await dataSource.query(
      `INSERT INTO "user" (email, password, role) VALUES ('admin_cert@test.com', '${hashedPassword}', '${Role.SUPER_ADMIN}')`,
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin_cert@test.com', password: 'admin123' });

    accessToken = loginRes.body.data.access_token;

    // 1. Année Universitaire
    await dataSource.query(
      `INSERT INTO annee_universitaire (label, "startDate", "endDate", "isActive") VALUES ('2025-2026', '2025-10-01', '2026-07-31', true)`,
    );

    // 2. Etab
    const etab = await request(app.getHttpServer())
      .post('/api/etablissement')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cert Etab',
        address: 'Dakar',
        email: 'cert@test.com',
        phone: '123',
      });
    const etabId = etab.body.data.id;

    // 3. Niveau
    const niv = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'L1 Cert' });
    const nivId = niv.body.data.id;

    // 4. Classe
    const cls = await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Classe Cert',
        etablissementIds: [etabId],
        niveauIds: [nivId],
      });
    const clsId = cls.body.data.id;

    // 5. Etudiant
    const etu = await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Jean',
        lastName: 'Certif',
        email: 'jean.cert@test.com',
        matricule: 'MAT-CERT-001',
        birthDate: '2000-01-01',
        birthPlace: 'Dakar',
        etablissementId: etabId,
        classeId: clsId,
        niveauId: nivId,
        parentsData: [
          { firstName: 'P', lastName: 'P', gender: 'Père', phoneNumber: '000' },
        ],
      });
    etudiantId = etu.body.data.id;
  });

  afterAll(async () => {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }
    await app.close();
  });

  it('1. Génération Certificat de Scolarité', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/certificates/scolarity/${etudiantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.pdfUrl).toBeDefined();
    expect(res.body.data.pdfUrl).toContain('certificat_scolarite_MAT-CERT-001');
  });

  it('2. Génération Attestation de Réussite', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/certificates/success/${etudiantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.pdfUrl).toBeDefined();
    expect(res.body.data.pdfUrl).toContain('attestation_reussite_MAT-CERT-001');
  });

  it("3. Consultation de l'historique (Admin)", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/certificates/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.items[0].type).toBeDefined();
    expect(res.body.data.items[0].etudiant.id).toBe(etudiantId);
  });

  it("4. Consultation de l'historique par étudiant (Admin)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/certificates/history?etudiantId=${etudiantId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Erreur si étudiant inexistant', async () => {
    await request(app.getHttpServer())
      .get('/api/certificates/scolarity/999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
