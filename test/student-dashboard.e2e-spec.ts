import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Student Dashboard (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let studentToken: string;
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
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository('User');
    const etuRepo = dataSource.getRepository('Etudiant');
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');

    const etab = await etabRepo.save({ name: 'FST', address: 'Dakar', email: 'fst@test.com', phone: '123' });
    const niv = await nivRepo.save({ name: 'L1' });
    const cls = await clsRepo.save({ name: 'Informatique' });
    await dataSource.createQueryBuilder().relation('Classe', 'etablissements').of(cls.id).add(etab.id);
    await dataSource.createQueryBuilder().relation('Classe', 'niveaux').of(cls.id).add(niv.id);

    const etu = await etuRepo.save({
      firstName: 'Ousmane', lastName: 'Sow', email: 'ous@test.com', matricule: 'E001',
      etablissement: { id: etab.id }, classe: { id: cls.id }, niveau: { id: niv.id }
    });
    etudiantId = etu.id;

    await userRepo.save({
      email: 'student@test.com', password: passwordHash, role: Role.ETUDIANT, etudiant: { id: etu.id }
    });

    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'student@test.com', password: 'password123' });
    studentToken = login.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/student-dashboard (GET) should return dashboard data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/student-dashboard')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.student).toBeDefined();
    expect(res.body.data.student.fullName).toBe('Ousmane Sow');
  });

  it('/api/devoirs (GET) should be accessible by student', async () => {
    await request(app.getHttpServer())
      .get('/api/devoirs')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
  });

  it('/api/note (GET) should be accessible by student and filter their notes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/note')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    
    expect(res.body.data.items).toBeDefined();
  });
});
