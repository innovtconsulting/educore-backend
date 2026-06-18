import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { TenantInterceptor } from './../src/common/tenant/tenant.interceptor';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/user/entities/user.entity';

describe('Student Import (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let authToken: string;

  let etablissementId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalInterceptors(new TenantInterceptor());
    await app.init();

    dataSource = app.get(DataSource);

    // Nettoyage
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Création Admin
    const passwordHash = await bcrypt.hash('password123', 10);
    await dataSource.getRepository('User').save({
      email: 'admin@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    authToken = loginRes.body.data.access_token;

    // Créer Etablissement
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'ESPM TEST',
        address: 'Test',
        email: 'espm@test.sn',
        phone: '123456789',
      });
    etablissementId = etablissement.body.data.id;

    // Créer un utilisateur ADMIN pour cet établissement
    const adminPassword = 'password123';
    const adminEmail = 'admin.espm@test.com';
    await dataSource.getRepository('User').save({
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: Role.ADMIN,
      etablissementId: etablissementId,
      isActive: true,
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    authToken = adminLoginRes.body.data.access_token;

    // Créer Niveaux et Classes nécessaires pour base.xlsx
    const n1 = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'L3' });
    
    await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'SF',
        etablissementIds: [etablissementId],
        niveauIds: [n1.body.data.id],
      });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Validation du fichier base.xlsx (Feuille ESPM)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/etudiants/import/validate?sheetName=ESPM')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', join(__dirname, '..', 'base.xlsx'))
      .expect(201);

    expect(res.body.data.validStudents.length).toBeGreaterThan(0);
    // Stocker pour l'étape suivante
    const validStudents = res.body.data.validStudents;

    // 2. Confirmation de l'import
    const confirmRes = await request(app.getHttpServer())
      .post('/api/etudiants/import/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ students: validStudents })
      .expect(201);

    expect(confirmRes.body.data.success).toBeGreaterThan(0);
    expect(confirmRes.body.data.failed).toBe(0);
  });

  it('3. Vérification des comptes utilisateurs créés', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/etudiants')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const students = res.body.data.items;
    expect(students.length).toBeGreaterThan(0);
    
    // Vérifier qu'un étudiant a bien un user lié
    const studentWithUser = students.find(s => s.user);
    expect(studentWithUser).toBeDefined();
    expect(studentWithUser.user.isActive).toBe(false);
  });
});
