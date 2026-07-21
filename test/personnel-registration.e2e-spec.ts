import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import { MailService } from './../src/mail/mail.service';

describe('Personnel Registration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        sendMail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
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

    // Create a base user for testing personnel registration (activation)
    // We create it without a password to simulate a pre-created account
    const userRepo = dataSource.getRepository('User');
    await userRepo.save({
      email: 'comptable@test.com',
      role: Role.COMPTABLE,
      isActive: true,
      // No password
    });

    await userRepo.save({
      email: 'monitrice@test.com',
      role: Role.MONITRICE,
      isActive: true,
      // No password
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Personnel Activation by ID', () => {
    it('should activate a COMPTABLE account using ID and password', async () => {
      // Find the user ID first
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOne({
        where: { email: 'comptable@test.com' },
      });
      const userId = user?.id;

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          id: userId,
          password: 'new-password-123',
          role: Role.COMPTABLE,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('Activation du compte réussie.');
      expect(res.body.data.user.email).toBe('comptable@test.com');

      // Verify login works now
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'comptable@test.com',
          password: 'new-password-123',
        });
      expect(loginRes.status).toBe(201);
      expect(loginRes.body.data.access_token).toBeDefined();
    });

    it('should activate a MONITRICE account using ID and password', async () => {
      // Find the user ID first
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOne({
        where: { email: 'monitrice@test.com' },
      });
      const userId = user?.id;

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          id: userId,
          password: 'secure-password-surv',
          role: Role.MONITRICE,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('Activation du compte réussie.');
      expect(res.body.data.user.email).toBe('monitrice@test.com');
    });

    it('should fail if ID is missing for personnel role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          password: 'some-password',
          role: Role.COMPTABLE,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("L'ID est obligatoire");
    });

    it('should fail if role mismatch', async () => {
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOne({
        where: { email: 'comptable@test.com' },
      });
      const userId = user?.id;

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          id: userId,
          password: 'some-password',
          role: Role.ADMIN, // Wrong role for this ID
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        'Le rôle demandé (Admin) ne correspond pas',
      );
    });

    it('should fail if account is already activated', async () => {
      // The comptable account was already activated in the first test
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOne({
        where: { email: 'comptable@test.com' },
      });
      const userId = user?.id;

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          id: userId,
          password: 'another-password',
          role: Role.COMPTABLE,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ce compte est déjà activé');
    });
  });
});
