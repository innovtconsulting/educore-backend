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
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Configuration de base : Etablissement, Niveau, Classe
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');
    const settingRepo = dataSource.getRepository('GlobalSetting');

    const etab = await etabRepo.save({
      name: 'Test Etab',
      address: 'Dakar',
      email: 'etab@test.com',
      phone: '123',
    });
    const niv = await nivRepo.save({ name: 'L1' });
    await clsRepo.save({
      name: 'Info',
      etablissements: [etab],
      niveaux: [niv],
    });

    // Activer l'inscription étudiant dans les réglages globaux
    await settingRepo.save({
      key: 'ENABLE_STUDENT_REGISTRATION',
      value: 'true',
      category: 'SECURITY',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Personnel Registration (Disabled)', () => {
    it('should fail to register an admin via public register endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          role: Role.ADMIN,
          email: 'admin.attempt@test.com',
          password: 'somepassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        "L'auto-inscription n'est pas disponible pour le rôle Admin",
      );
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
