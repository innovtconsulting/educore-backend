import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/user/entities/user.entity';
import { AppDataSource } from '../src/data-source';
import * as path from 'path';
import * as fs from 'fs';

describe('User Profile Integration (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let studentToken: string;
  let studentId: number;
  let studentUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login as SuperAdmin to get token
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'superadmin@espm.sn', password: 'password123' });
    adminToken = adminLogin.body.access_token;

    // Get student info
    const studentUser = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: 'ousmane.sow@espm.sn' });

    studentUserId = studentUser.body.items[0].id;
    studentId = studentUser.body.items[0].etudiant.id;

    // Login as Student
    const studentLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ousmane.sow@espm.sn', password: 'password123' });
    studentToken = studentLogin.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Username Sync', () => {
    it('should sync username with firstName when student profile is updated', async () => {
      // Update student firstName
      await request(app.getHttpServer())
        .patch(`/etudiants/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'OusmaneNew' });

      // Verify User username is updated
      const userResponse = await request(app.getHttpServer())
        .get(`/users/${studentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(userResponse.body.username).toBe('OusmaneNew');
    });

    it('should sync firstName with username when user profile is updated', async () => {
      // Update user username
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ username: 'OusmaneSync' });

      // Verify Etudiant firstName is updated
      const studentResponse = await request(app.getHttpServer())
        .get(`/etudiants/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(studentResponse.body.data.firstName).toBe('OusmaneSync');
    });
  });

  describe('Profile Picture Centralization', () => {
    it('should upload profile picture to User and sync with Etudiant', async () => {
      const dummyImagePath = path.join(__dirname, 'test-image.png');
      fs.writeFileSync(dummyImagePath, 'dummy image content');

      const response = await request(app.getHttpServer())
        .post('/users/me/profile-picture')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('file', dummyImagePath);

      expect(response.status).toBe(201);
      const photoPath = response.body.data.photoPath;
      expect(photoPath).toBeDefined();

      // Vérification physique du fichier sur le disque
      const absoluteUploadedPath = path.join(process.cwd(), photoPath);
      expect(fs.existsSync(absoluteUploadedPath)).toBe(true);

      // Check User entity
      const userResponse = await request(app.getHttpServer())
        .get(`/users/${studentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(userResponse.body.photoPath).toBe(photoPath);

      // Check Etudiant entity
      const studentResponse = await request(app.getHttpServer())
        .get(`/etudiants/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(studentResponse.body.data.photoPath).toBe(photoPath);

      // Cleanup: Supprimer le fichier local de test ET le fichier uploadé
      if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
      if (fs.existsSync(absoluteUploadedPath))
        fs.unlinkSync(absoluteUploadedPath);
    });
  });
});
