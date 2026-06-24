import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Role } from './../src/user/entities/user.entity';
import { DataSource } from 'typeorm';

describe('Debug Pagination (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    dataSource = app.get(DataSource);

    // Create a SuperAdmin
    const passwordHash = await require('bcrypt').hash('password123', 10);
    await dataSource.query(
      `INSERT INTO "user" (email, password, role, "isActive") VALUES ('superadmin@test.com', '${passwordHash}', '${Role.SUPER_ADMIN}', true)`,
    );

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'superadmin@test.com', password: 'password123' });

    superAdminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /etudiants - Check if SuperAdmin sees all data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/etudiants?limit=100')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    console.log('Total items:', res.body.data.total);
    expect(res.body.data).toBeDefined();
  });
});
