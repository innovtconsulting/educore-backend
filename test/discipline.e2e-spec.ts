import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DisciplineCategory } from '../src/discipline/entities/discipline.entity';
import { DataSource } from 'typeorm';
import { Role } from '../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('DisciplineController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get(DataSource);

    // Clean and setup admin for auth
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    await dataSource.getRepository('User').save({
      email: 'admin.discipline@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin.discipline@test.com', password: 'password123' });
    authToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  const testDiscipline = {
    title: 'Test Discipline',
    content: 'Test Content',
    category: DisciplineCategory.DISCIPLINE,
    isActive: true,
  };

  let disciplineId: number;

  it('/discipline (POST)', () => {
    return request(app.getHttpServer())
      .post('/discipline')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testDiscipline)
      .expect(201)
      .then((response) => {
        expect(response.body.id).toBeDefined();
        expect(response.body.title).toBe(testDiscipline.title);
        disciplineId = response.body.id;
      });
  });

  it('/discipline (GET)', () => {
    return request(app.getHttpServer())
      .get('/discipline')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
  });

  it('/discipline (GET) - with category filter', () => {
    return request(app.getHttpServer())
      .get(`/discipline?category=${DisciplineCategory.DISCIPLINE}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        response.body.forEach((item: any) => {
          expect(item.category).toBe(DisciplineCategory.DISCIPLINE);
        });
      });
  });

  it('/discipline/:id (GET)', () => {
    return request(app.getHttpServer())
      .get(`/discipline/${disciplineId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)
      .then((response) => {
        expect(response.body.id).toBe(disciplineId);
        expect(response.body.title).toBe(testDiscipline.title);
      });
  });

  it('/discipline/:id (PATCH)', () => {
    const updateData = { title: 'Updated Title' };
    return request(app.getHttpServer())
      .patch(`/discipline/${disciplineId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200)
      .then((response) => {
        expect(response.body.title).toBe(updateData.title);
      });
  });

  it('/discipline/:id (DELETE)', () => {
    return request(app.getHttpServer())
      .delete(`/discipline/${disciplineId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });

  it('/discipline/:id (GET) - Not Found after delete', () => {
    return request(app.getHttpServer())
      .get(`/discipline/${disciplineId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
