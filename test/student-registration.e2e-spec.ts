import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import { MailService } from './../src/mail/mail.service';

describe('Student Registration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mailService: MailService;

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
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dataSource = app.get(DataSource);
    mailService = app.get(MailService);
    
    // Clean database
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    // Create a base student for testing registration
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');
    const etuRepo = dataSource.getRepository('Etudiant');
    const parentRepo = dataSource.getRepository('Parent');

    const etab = await etabRepo.save({ name: 'Test Etab', address: 'Test', email: 'etab@test.com', phone: '123' });
    const niv = await nivRepo.save({ name: 'L1' });
    const cls = await clsRepo.save({ name: 'Informatique' });
    // ManyToMany relations need manual insertion or using the repository save with objects
    await dataSource.createQueryBuilder().relation('Classe', 'etablissements').of(cls).add(etab);
    await dataSource.createQueryBuilder().relation('Classe', 'niveaux').of(cls).add(niv);

    const parent = await parentRepo.save({ firstName: 'P', lastName: 'A', gender: 'Père', phoneNumber: '000' });

    await etuRepo.save({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      matricule: 'MAT-001',
      etablissement: etab,
      classe: cls,
      niveau: niv,
      parents: [parent]
    });

    const teacherRepo = dataSource.getRepository('Enseignant');
    await teacherRepo.save({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@test.com',
      matricule: 'T-001',
      dateEmbauche: new Date()
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Student Registration', () => {
    it('should register a student using only matricule and password (auto-fill email)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          password: 'password123',
          role: Role.ETUDIANT,
          matricule: 'MAT-001'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('Inscription réussie.');
      expect(res.body.data.user.email).toBe('john.doe@test.com'); // De l'étudiant John Doe
    });

    it('should allow providing etudiantData for a new student registration (unified flow)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          password: 'password-new-stu',
          role: Role.ETUDIANT,
          etudiantData: {
            firstName: 'New',
            lastName: 'Student',
            email: 'new.student@test.com',
            etablissementId: 1,
            classeId: 1,
            niveauId: 1,
            parentsData: [{ firstName: 'P', lastName: 'S', gender: 'Père', phoneNumber: '999888777' }]
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toContain('pré-inscription a été enregistrée avec succès');
    });
  });

  describe('Teacher Registration', () => {
    it('should register a teacher with a valid matricule (auto-fill email)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          password: 'password123',
          role: Role.ENSEIGNANT,
          matricule: 'T-001'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('Inscription réussie.');
      expect(res.body.data.user.email).toBe('jane.smith@test.com'); // De l'enseignant Jane Smith
    });

    it('should fail to register with a non-existent teacher matricule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'ghost.t@test.com',
          password: 'password123',
          role: Role.ENSEIGNANT,
          matricule: 'T-999'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Aucun enseignant trouvé');
    });

    it('should fail if enseignantData is provided for teacher role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'illegal.t@test.com',
          password: 'password123',
          role: Role.ENSEIGNANT,
          matricule: 'T-001',
          enseignantData: {
            firstName: 'Illegal',
            lastName: 'Teacher',
            email: 'ill.t@test.com',
            matricule: 'T-ILL',
            dateEmbauche: '2026-01-01'
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("L'auto-inscription ne permet pas la création d'un nouveau profil enseignant");
    });
  });

  describe('Profile Management', () => {
    let studentToken: string;

    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'password123'
        });
      studentToken = loginRes.body.data.access_token;
    });

    it('should get current user profile (GET /users/me)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('john.doe@test.com');
      expect(res.body.data.etudiant).toBeDefined();
    });

    it('should update current user profile (PATCH /users/me)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          phoneNumber: '+221 77 111 22 33',
          address: 'New Dakar Address'
        });

      expect(res.status).toBe(200);
      // Check if profile is updated
      expect(res.body.data.etudiant.phoneNumber).toBe('+221 77 111 22 33');
      expect(res.body.data.etudiant.address).toBe('New Dakar Address');
    });
  });

  describe('Password Reset Flow', () => {
    let resetToken: string;

    it('should request a password reset (POST /auth/forgot-password)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'john.doe@test.com' });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('lien de réinitialisation a été envoyé');

      // Pour le test, on récupère le token directement en base (car on ne peut pas lire l'email réel ici)
      const userRepo = dataSource.getRepository('User');
      const user = await userRepo.findOne({ where: { email: 'john.doe@test.com' } });
      resetToken = (user as any).resetPasswordToken;
      expect(resetToken).toBeDefined();
    });

    it('should reset password with a valid token (POST /auth/reset-password)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'new-secure-password'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('réinitialisé avec succès');

      // Verify login with new password
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'john.doe@test.com',
          password: 'new-secure-password'
        });
      expect(loginRes.status).toBe(201);
      expect(loginRes.body.data.access_token).toBeDefined();
    });

    it('should fail to reset password with an invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'some-password'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Token invalide ou expiré');
    });
  });
});
