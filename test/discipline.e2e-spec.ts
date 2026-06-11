import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DisciplineCategory } from '../src/discipline/entities/discipline.entity';

describe('DisciplineController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
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
      .expect(200)
      .then((response) => {
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
  });

  it('/discipline (GET) - with category filter', () => {
    return request(app.getHttpServer())
      .get(`/discipline?category=${DisciplineCategory.DISCIPLINE}`)
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
      .send(updateData)
      .expect(200)
      .then((response) => {
        expect(response.body.title).toBe(updateData.title);
      });
  });

  it('/discipline/:id (DELETE)', () => {
    return request(app.getHttpServer())
      .delete(`/discipline/${disciplineId}`)
      .expect(200);
  });

  it('/discipline/:id (GET) - Not Found after delete', () => {
    return request(app.getHttpServer())
      .get(`/discipline/${disciplineId}`)
      .expect(404);
  });
});
