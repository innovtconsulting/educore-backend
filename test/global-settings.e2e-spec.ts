import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Global Settings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let superAdminToken: string;

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

    // Clean DB
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository('User');
    const settingRepo = dataSource.getRepository('GlobalSetting');
    
    await userRepo.save({
      email: 'super@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    // Re-seed settings after truncate
    await settingRepo.save([
      { key: 'ENABLE_STUDENT_REGISTRATION', value: 'true', category: 'SECURITY' as any },
      { key: 'ENABLE_TEACHER_REGISTRATION', value: 'true', category: 'SECURITY' as any },
    ]);

    const superRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'super@test.com', password: 'password123' });
    superAdminToken = superRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. List default settings', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/global-settings')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    
    expect(res.body.data.length).toBeGreaterThan(0);
    const registrationSetting = res.body.data.find(s => s.key === 'ENABLE_STUDENT_REGISTRATION');
    expect(registrationSetting).toBeDefined();
    expect(registrationSetting.value).toBe('true');
  });

  it('2. Disable student registration and verify block', async () => {
    // Disable registration
    await request(app.getHttpServer())
      .patch('/api/global-settings/ENABLE_STUDENT_REGISTRATION')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ value: 'false' })
      .expect(200);

    // Setup student to register
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');
    const etuRepo = dataSource.getRepository('Etudiant');

    const etab = await etabRepo.save({ name: 'Test Etab', address: 'X', email: 'x@test.com', phone: '1' });
    const niv = await nivRepo.save({ name: 'L1' });
    const cls = await clsRepo.save({ name: 'Info', etablissements: [etab], niveaux: [niv] });
    
    await etuRepo.save({
      firstName: 'Test', lastName: 'Student', email: 'student@test.com', matricule: 'TEST001',
      etablissement: etab, niveau: niv, classe: cls
    });

    // Try to register
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'student@test.com',
        password: 'password123',
        role: Role.ETUDIANT,
        matricule: 'TEST001'
      })
      .expect(400);

    expect(res.body.message).toContain("L'auto-inscription des étudiants est actuellement désactivée");
  });

  it('3. Re-enable and verify success', async () => {
    // Enable registration
    await request(app.getHttpServer())
      .patch('/api/global-settings/ENABLE_STUDENT_REGISTRATION')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ value: 'true' })
      .expect(200);

    // Try to register again
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'student@test.com',
        password: 'password123',
        role: Role.ETUDIANT,
        matricule: 'TEST001'
      })
      .expect(201);
  });
});
