import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';

describe('Student Registration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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

    it('should fail if etudiantData is provided for student role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'illegal@test.com',
          password: 'password123',
          role: Role.ETUDIANT,
          matricule: 'MAT-001',
          etudiantData: {
            firstName: 'Illegal',
            lastName: 'User',
            email: 'illegal@test.com',
            etablissementId: 1,
            classeId: 1,
            niveauId: 1
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("L'auto-inscription ne permet pas la création d'un nouveau profil");
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
});
