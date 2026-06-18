import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Note Restriction (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let adminToken: string;
  let teacher1Token: string; // Responsable
  let teacher2Token: string; // Non responsable
  let surveillantToken: string;

  let etudiantId: number;
  let evaluationId: number;
  let noteId: number;

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

    // Nettoyage
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository('User');
    const teacherRepo = dataSource.getRepository('Enseignant');
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const matRepo = dataSource.getRepository('Matiere');
    const affectRepo = dataSource.getRepository('Affectation');
    const etuRepo = dataSource.getRepository('Etudiant');
    const clsRepo = dataSource.getRepository('Classe');
    const anneeRepo = dataSource.getRepository('AnneeUniversitaire');
    const semRepo = dataSource.getRepository('Semestre');
    const evalRepo = dataSource.getRepository('Evaluation');

    // Setup base data
    const etab = await etabRepo.save({
      name: 'FST',
      address: 'Dakar',
      email: 'fst@test.com',
      phone: '123',
    });
    const niv = await nivRepo.save({ name: 'L1' });
    const cls = await clsRepo.save({ name: 'Informatique' });
    // Link class to etab and niv
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

    const mat = await matRepo.save({
      name: 'Algorithmique',
      code: 'ALG1',
      coefficient: 4,
    });
    await dataSource
      .createQueryBuilder()
      .relation('Matiere', 'classes')
      .of(mat.id)
      .add(cls.id);
    await dataSource
      .createQueryBuilder()
      .relation('Matiere', 'niveaux')
      .of(mat.id)
      .add(niv.id);

    // Create Teachers
    const t1 = await teacherRepo.save({
      firstName: 'Moussa',
      lastName: 'Diallo',
      email: 't1@test.com',
      matricule: 'T001',
      dateEmbauche: new Date(),
    });
    const t2 = await teacherRepo.save({
      firstName: 'Mariam',
      lastName: 'Sow',
      email: 't2@test.com',
      matricule: 'T002',
      dateEmbauche: new Date(),
    });

    // Affectation for T1 only
    await affectRepo.save({
      enseignant: { id: t1.id },
      matiere: { id: mat.id },
      etablissement: { id: etab.id },
      niveau: { id: niv.id },
    });

    // Create Users
    await userRepo.save([
      { email: 'admin@test.com', password: passwordHash, role: Role.ADMIN },
      {
        email: 't1@test.com',
        password: passwordHash,
        role: Role.ENSEIGNANT,
        enseignant: { id: t1.id },
      },
      {
        email: 't2@test.com',
        password: passwordHash,
        role: Role.ENSEIGNANT,
        enseignant: { id: t2.id },
      },
      {
        email: 'surv@test.com',
        password: passwordHash,
        role: Role.SURVEILLANT,
      },
    ]);

    // Tokens
    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'password123' });
      return res.body.data.access_token;
    };
    adminToken = await login('admin@test.com');
    teacher1Token = await login('t1@test.com');
    teacher2Token = await login('t2@test.com');
    surveillantToken = await login('surv@test.com');

    // Create Student
    const etu = await etuRepo.save({
      firstName: 'Ousmane',
      lastName: 'Diallo',
      email: 'ous@test.com',
      matricule: 'E001',
      etablissement: { id: etab.id },
      classe: { id: cls.id },
      niveau: { id: niv.id },
    });
    etudiantId = etu.id;

    // Create Academic context
    const annee = await anneeRepo.save({
      label: '2026-2027',
      startDate: '2026-10-01',
      endDate: '2027-07-31',
    });
    const sem = await semRepo.save({
      name: 'S1',
      startDate: '2026-10-01',
      endDate: '2027-02-28',
      anneeUniversitaire: { id: annee.id },
    });

    // Create Evaluation (by Admin for simplicity)
    const ev = await evalRepo.save({
      title: 'CC1',
      type: 'Contrôle Continu',
      weight: 1,
      date: '2026-11-01',
      matiere: { id: mat.id },
      classe: { id: cls.id },
      niveau: { id: niv.id },
      semestre: { id: sem.id },
    });
    evaluationId = ev.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Note Creation Permissions', () => {
    it('Teacher 1 (Responsible) can create a note', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/note')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({ value: 15, etudiantId, evaluationId })
        .expect(201);
      noteId = res.body.data.id;
    });

    it('Teacher 2 (Not Responsible) CANNOT create a note', async () => {
      await request(app.getHttpServer())
        .post('/api/note')
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({ value: 12, etudiantId, evaluationId })
        .expect(403);
    });

    it('Surveillant CANNOT create a note', async () => {
      await request(app.getHttpServer())
        .post('/api/note')
        .set('Authorization', `Bearer ${surveillantToken}`)
        .send({ value: 10, etudiantId, evaluationId })
        .expect(403);
    });
  });

  describe('Note Update/Delete Permissions', () => {
    it('Teacher 1 (Responsible) can update their note', async () => {
      await request(app.getHttpServer())
        .patch(`/api/note/${noteId}`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({ value: 16 })
        .expect(200);
    });

    it('Teacher 2 (Not Responsible) CANNOT update the note', async () => {
      await request(app.getHttpServer())
        .patch(`/api/note/${noteId}`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({ value: 20 })
        .expect(403);
    });

    it('Admin can update any note', async () => {
      await request(app.getHttpServer())
        .patch(`/api/note/${noteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 18 })
        .expect(200);
    });

    it('Teacher 2 (Not Responsible) CANNOT delete the note', async () => {
      await request(app.getHttpServer())
        .delete(`/api/note/${noteId}`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .expect(403);
    });

    it('Teacher 1 (Responsible) can delete their note', async () => {
      await request(app.getHttpServer())
        .delete(`/api/note/${noteId}`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);
    });

    it('Admin can create a note after deletion', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/note')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 14, etudiantId, evaluationId })
        .expect(201);
      noteId = res.body.data.id;
    });

    it('Admin can delete any note', async () => {
      await request(app.getHttpServer())
        .delete(`/api/note/${noteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Consultation Permissions', () => {
    it('Teacher 2 can consult notes (even if not responsible)', async () => {
      await request(app.getHttpServer())
        .get('/api/note')
        .set('Authorization', `Bearer ${teacher2Token}`)
        .expect(200);
    });

    it('Surveillant can consult notes', async () => {
      await request(app.getHttpServer())
        .get('/api/note')
        .set('Authorization', `Bearer ${surveillantToken}`)
        .expect(200);
    });
  });
});
