import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';

describe('Registration & Activation (e2e)', () => {
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

    // Nettoyage de la base
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    // Configuration de base : Etablissement, Niveau, Classe
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');
    const settingRepo = dataSource.getRepository('GlobalSetting');

    const etab = await etabRepo.save({ name: 'Test Etab', address: 'Dakar', email: 'etab@test.com', phone: '123' });
    const niv = await nivRepo.save({ name: 'L1' });
    await clsRepo.save({ name: 'Info', etablissements: [etab], niveaux: [niv] });

    // Activer l'inscription étudiant dans les réglages globaux
    await settingRepo.save({ key: 'ENABLE_STUDENT_REGISTRATION', value: 'true', category: 'SECURITY' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Student Activation (by Matricule)', () => {
    it('should activate a student account using matricule', async () => {
      const etudiantRepo = dataSource.getRepository('Etudiant');
      const etabRepo = dataSource.getRepository('Etablissement');
      const nivRepo = dataSource.getRepository('Niveau');
      const clsRepo = dataSource.getRepository('Classe');

      const etab = await etabRepo.findOneBy({ name: 'Test Etab' });
      const niv = await nivRepo.findOneBy({ name: 'L1' });
      const cls = await clsRepo.findOneBy({ name: 'Info' });

      const student = await etudiantRepo.save({
        firstName: 'Ousmane',
        lastName: 'Sow',
        email: 'ousmane.sow@test.com',
        matricule: 'ETU-2026-OK',
        etablissement: { id: etab!.id },
        classe: { id: cls!.id },
        niveau: { id: niv!.id },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ETUDIANT,
          matricule: 'ETU-2026-OK',
          password: 'newpassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('ousmane.sow@test.com');
      
      // Vérifier le login
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ousmane.sow@test.com',
          password: 'newpassword123',
        });
      expect(loginRes.status).toBe(201);
      expect(loginRes.body.data.access_token).toBeDefined();
    });

    it('should fail if matricule is unknown', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ETUDIANT,
          matricule: 'UNKNOWN',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('Personnel Activation (by ID)', () => {
    it('should activate an admin account using ID', async () => {
      const userRepo = dataSource.getRepository('User');
      const admin = await userRepo.save({
        email: 'activation.admin@test.com',
        role: Role.ADMIN,
        isActive: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ADMIN,
          id: admin.id,
          password: 'activatedPass123',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toContain('Activation du compte réussie');

      // Vérifier le login
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'activation.admin@test.com',
          password: 'activatedPass123',
        });
      expect(loginRes.status).toBe(201);
    });

    it('should fail if ID is unknown', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ADMIN,
          id: 9999,
          password: 'password123',
        })
        .expect(404);
    });
  });

  describe('Parent Registration (by Phone Number)', () => {
    it('should register a parent using phone number as identifier', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.PARENT,
          password: 'parentpassword123',
          parentData: {
            firstName: 'Modou',
            lastName: 'Sow',
            gender: 'Père',
            phoneNumber: '+221 77 111 22 33',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('+221 77 111 22 33');

      // Vérifier le login avec le téléphone
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '+221 77 111 22 33',
          password: 'parentpassword123',
        });
      expect(loginRes.status).toBe(201);
    });

    it('should fail if phone number is missing for parent', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.PARENT,
          password: 'password123',
          parentData: {
            firstName: 'Awa',
            lastName: 'Sow',
            gender: 'Mère',
            // phoneNumber missing
          },
        })
        .expect(400);
    });
  });
});
