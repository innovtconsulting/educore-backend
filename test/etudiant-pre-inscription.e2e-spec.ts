import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { EnrollmentStatus } from './../src/etudiant/entities/etudiant.entity';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Etudiant Pre-inscription (e2e)', () => {
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

    // Clean database
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Seed necessary data
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');
    const userRepo = dataSource.getRepository('User');
    const settingRepo = dataSource.getRepository('GlobalSetting');

    const etab = await etabRepo.save({
      name: 'Test Etab',
      address: 'Test',
      email: 'etab@test.com',
      phone: '123',
    });
    const niv = await nivRepo.save({ name: 'L1' });
    const cls = await clsRepo.save({ name: 'Informatique' });
    await dataSource
      .createQueryBuilder()
      .relation('Classe', 'etablissements')
      .of(cls)
      .add(etab);
    await dataSource
      .createQueryBuilder()
      .relation('Classe', 'niveaux')
      .of(cls)
      .add(niv);

    // Create Admin for validation
    const hashedPassword = await bcrypt.hash('password123', 10);
    await userRepo.save({
      email: 'admin@test.com',
      password: hashedPassword,
      role: Role.ADMIN,
      etablissementId: etab.id,
      isActive: true,
    });

    // Enable student registration
    await settingRepo.save({
      key: 'ENABLE_STUDENT_REGISTRATION',
      value: 'true',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Pre-inscription Flow', () => {
    it('should allow a student to pre-register via /auth/register', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ETUDIANT,
          password: 'password-jane',
          etudiantData: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@student.com',
            etablissementId: 1,
            classeId: 1,
            niveauId: 1,
            parentsData: [
              {
                firstName: 'Papa',
                lastName: 'Smith',
                gender: 'Père',
                phoneNumber: '111222333',
              },
            ],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toContain(
        'Votre demande de pré-inscription a été enregistrée avec succès',
      );

      // Vérifier que le compte User est créé mais inactif
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOneBy({
        email: 'jane.smith@student.com',
      });
      expect(user).toBeDefined();
      expect(user?.isActive).toBe(false);

      // Vérifier que le compte Parent est créé mais inactif
      const parentUser = await userRepo.findOneBy({ email: '111222333' });
      expect(parentUser).toBeDefined();
      expect(parentUser?.isActive).toBe(false);
      expect(parentUser?.role).toBe(Role.PARENT);
    });

    it('should not allow duplicate email in pre-registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ETUDIANT,
          password: 'any-password',
          etudiantData: {
            firstName: 'Another',
            lastName: 'Jane',
            email: 'jane.smith@student.com',
            etablissementId: 1,
            classeId: 1,
            niveauId: 1,
            parentsData: [
              {
                firstName: 'P',
                lastName: 'S',
                gender: 'Père',
                phoneNumber: '444',
              },
            ],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("L'email existe déjà");
    });

    it('should allow admin to validate the pre-registration and activate accounts', async () => {
      // 1. Login as Admin
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      const adminToken = loginRes.body.data.access_token;

      // 2. Validate the student (Jane Smith is ID 1)
      const res = await request(app.getHttpServer())
        .patch('/api/etudiants/1/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          matricule: 'MAT-JANE-001',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EnrollmentStatus.ACTIF);

      // 3. Vérifier que les comptes sont activés
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOneBy({
        email: 'jane.smith@student.com',
      });
      expect(user?.isActive).toBe(true);

      const parentUser = await userRepo.findOneBy({ email: '111222333' });
      expect(parentUser?.isActive).toBe(true);
    });

    it('should allow student to login after validation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'jane.smith@student.com',
          password: 'password-jane',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.user.role).toBe(Role.ETUDIANT);
    });
  });
});
