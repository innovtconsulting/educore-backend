import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('School Life Supervisor (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let surveillantToken: string;
  let etudiantId: number;

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

    // Clean up
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository('User');
    const etuRepo = dataSource.getRepository('Etudiant');
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');

    const etab = await etabRepo.save({
      name: 'FST',
      address: 'Dakar',
      email: 'fst@test.com',
      phone: '123',
    });
    const niv = await nivRepo.save({ name: 'L1' });
    const cls = await clsRepo.save({ name: 'Informatique' });
    await dataSource
      .createQueryBuilder()
      .relation('Classe', 'etablissements')
      .of(cls.id)
      .add(etab.id);
    await dataSource
      .createQueryBuilder()
      .relation('Classe', 'niveaux')
      .of(cls.id)
      .add(niv.id);

    const etu = await etuRepo.save({
      firstName: 'Ousmane',
      lastName: 'Sow',
      email: 'ous@test.com',
      matricule: 'E001',
      etablissement: { id: etab.id },
      classe: { id: cls.id },
      niveau: { id: niv.id },
    });
    etudiantId = etu.id;

    await userRepo.save({
      email: 'supervisor@test.com',
      password: passwordHash,
      role: Role.SURVEILLANT,
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'supervisor@test.com', password: 'password123' });
    surveillantToken = login.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Supervisor can access Life Dashboard', async () => {
    await request(app.getHttpServer())
      .get('/api/life-dashboard')
      .set('Authorization', `Bearer ${surveillantToken}`)
      .expect(200);
  });

  it('Supervisor can create a sanction', async () => {
    await request(app.getHttpServer())
      .post('/api/sanctions')
      .set('Authorization', `Bearer ${surveillantToken}`)
      .send({
        etudiantId,
        type: 'Avertissement',
        motif: 'Retard répété',
        dateDecision: '2026-06-11',
      })
      .expect(201);
  });

  it('Supervisor can record attendance (Presence)', async () => {
    // Note: Needs an emploiDuTemp entry to be fully valid if we check logic,
    // but the controller role check is what we want here.
    // Let's just check the 404/400 because of missing data vs 403 Forbidden.
    const res = await request(app.getHttpServer())
      .post('/api/presence/bulk')
      .set('Authorization', `Bearer ${surveillantToken}`)
      .send({ emploiDuTempId: 999, items: [] });

    expect(res.status).not.toBe(403);
  });

  it('Supervisor can access Discipline rules', async () => {
    await request(app.getHttpServer())
      .get('/api/discipline')
      .set('Authorization', `Bearer ${surveillantToken}`)
      .expect(200);
  });

  it('Supervisor can access Daily Report preview', async () => {
    await request(app.getHttpServer())
      .get('/api/reporting/supervisor-daily')
      .set('Authorization', `Bearer ${surveillantToken}`)
      .expect(200);
  });
});
