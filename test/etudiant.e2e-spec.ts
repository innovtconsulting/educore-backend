import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/user/entities/user.entity';

describe('Student Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let authToken: string;

  let etablissementId: number;
  let classeId: number;
  let niveauId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads',
    });
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dataSource = app.get(DataSource);

    // Nettoyage et création d'un admin pour l'auth
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

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

    // Créer les relations nécessaires pour les tests
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Etab Test Etudiant',
        address: 'Test',
        email: 'etudiant.test@email.sn',
        phone: '123456789',
      });
    etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Niveau Test Etudiant' });
    niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Classe Test Etudiant',
        etablissementIds: [etablissementId],
        niveauIds: [niveauId],
      });
    classeId = classe.body.data.id;
  });

  afterAll(async () => {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await app.close();
  });

  let etudiantId: number;

  it('1. Création d\'un étudiant (Succès)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Test',
        lastName: 'Etudiant',
        email: 'test.etudiant@email.sn',
        matricule: 'ETU-TEST-001',
        etablissementId,
        classeId,
        niveauId,
        parentsData: [
          {
            firstName: 'Parent',
            lastName: 'Test',
            gender: 'Tuteur',
            phoneNumber: '000',
          },
        ],
      })
      .expect(201);
    
    etudiantId = res.body.data.id;
    expect(etudiantId).toBeDefined();
    expect(res.body.data.status).toBe('Actif');
  });

  it('2. ÉCHEC : Création d\'un étudiant avec matricule existant', async () => {
    await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Autre',
        lastName: 'Etudiant',
        email: 'autre@email.sn',
        matricule: 'ETU-TEST-001',
        etablissementId,
        classeId,
        niveauId,
        parentsData: [
          {
            firstName: 'Parent',
            lastName: 'Test',
            gender: 'Tuteur',
            phoneNumber: '000',
          },
        ],
      })
      .expect(400);
  });

  it('3. Mise à jour du statut (Admin)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/etudiants/${etudiantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'Suspendu',
      })
      .expect(200);
    
    expect(res.body.data.status).toBe('Suspendu');
  });

  it('4. Récupération avec relations', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/etudiants/${etudiantId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.data.etablissement).toBeDefined();
    expect(res.body.data.classe).toBeDefined();
    expect(res.body.data.niveau).toBeDefined();
  });

  it('5. Upload de photo de profil', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/etudiants/${etudiantId}/profile-picture`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('fake-image-content'), 'test.jpg')
      .expect(201);
    
    expect(res.body.data.photoPath).toContain('.jpg');
    
    // Vérifier l'accessibilité statique (optionnel mais recommandé)
    const photoUrl = res.body.data.photoPath.replace(/\\/g, '/');
    await request(app.getHttpServer())
      .get(`/${photoUrl}`)
      .expect(200);
  });

  it('6. Rejet de fichier non-image', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/etudiants/${etudiantId}/profile-picture`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('fake-text-content'), 'test.txt')
      .expect(400);
    
    expect(res.body.message).toContain('Seuls les fichiers images sont autorisés');
  });
});
