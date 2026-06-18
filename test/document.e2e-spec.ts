import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import * as path from 'path';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/user/entities/user.entity';

describe('Document Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let authToken: string;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dataSource = app.get(DataSource);

    // Clean state
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Setup admin
    const passwordHash = await bcrypt.hash('password123', 10);
    await dataSource.getRepository('User').save({
      email: 'admin.document@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin.document@test.com', password: 'password123' });
    authToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Upload d'un document", async () => {
    // Créer un fichier de test temporaire
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Contenu de test pour upload');

    const res = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', testFilePath)
      .field('title', 'Document de Test')
      .field('description', 'Une description de test')
      .field('category', 'Administratif')
      .expect(201);

    expect(res.body.data.title).toBe('Document de Test');
    expect(res.body.data.filePath).toBeDefined();

    // Nettoyage fichier de test
    fs.unlinkSync(testFilePath);
  });

  it('2. Récupérer tous les documents', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('Document de Test');
  });

  it('3. Supprimer un document', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/documents')
      .set('Authorization', `Bearer ${authToken}`);
    const docId = listRes.body.data.items[0].id;
    const filePath = listRes.body.data.items[0].filePath;

    await request(app.getHttpServer())
      .delete(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Vérifier que le fichier physique est supprimé
    expect(fs.existsSync(filePath)).toBe(false);

    const finalRes = await request(app.getHttpServer())
      .get('/api/documents')
      .set('Authorization', `Bearer ${authToken}`);
    expect(finalRes.body.data.items).toHaveLength(0);
  });
});
