import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Auth & Roles (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let superAdminToken: string;
  let adminToken: string;
  let teacherToken: string;

  let matRepo: any;
  let nivRepo: any;
  let etabRepo: any;

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

    // Nettoyage et création d'utilisateurs de test
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository('User');
    const teacherRepo = dataSource.getRepository('Enseignant');
    etabRepo = dataSource.getRepository('Etablissement');
    nivRepo = dataSource.getRepository('Niveau');
    matRepo = dataSource.getRepository('Matiere');
    const affectRepo = dataSource.getRepository('Affectation');

    // Create Base Entities
    const teacher = await teacherRepo.save({
      firstName: 'T', lastName: 'E', email: 'teacher@test.com', matricule: 'T001', dateEmbauche: new Date()
    });

    await userRepo.save([
      { email: 'super@test.com', password: passwordHash, role: Role.SUPER_ADMIN },
      { email: 'admin@test.com', password: passwordHash, role: Role.ADMIN },
      { email: 'teacher@test.com', password: passwordHash, role: Role.ENSEIGNANT, enseignant: { id: teacher.id } },
    ]);

    // Setup for teacher tests
    const etab = await etabRepo.save({ name: 'Base Etab', address: 'T', email: 'b@t.com', phone: '1' });
    const niv = await nivRepo.save({ name: 'Base Niv' });
    const mat = await matRepo.save({ name: 'Base Mat', code: 'BMAT', coefficient: 1 });
    
    await affectRepo.save({
      enseignant: { id: teacher.id },
      matiere: { id: mat.id },
      etablissement: { id: etab.id },
      niveau: { id: niv.id }
    });

    // Récupération des tokens
    const superRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'super@test.com', password: 'password123' });
    superAdminToken = superRes.body.data.access_token;

    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminRes.body.data.access_token;

    const teacherRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'teacher@test.com', password: 'password123' });
    teacherToken = teacherRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('UserController (SuperAdmin Only)', () => {
    it('GET /users - Success for SuperAdmin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /users - Forbidden for Admin', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('POST /users - Success for SuperAdmin', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: 'new@test.com', password: 'password123', role: Role.ADMIN })
        .expect(201);
    });
  });

  describe('EtablissementController (Modifications SuperAdmin Only)', () => {
    let etabId: number;

    it('POST /etablissement - Success for SuperAdmin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/etablissement')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Role Etab', address: 'Test', email: 'role@test.com', phone: '123' })
        .expect(201);
      etabId = res.body.data.id;
    });

    it('POST /etablissement - Forbidden for Admin', async () => {
      await request(app.getHttpServer())
        .post('/api/etablissement')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Etab', address: 'Test', email: 'admin.etab@test.com', phone: '123' })
        .expect(403);
    });

    it('GET /etablissement - Success for Admin', async () => {
      await request(app.getHttpServer())
        .get('/api/etablissement')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('ReportingController (Global Stats)', () => {
    it('GET /reporting/global-stats - Success for SuperAdmin', async () => {
      await request(app.getHttpServer())
        .get('/api/reporting/global-stats')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });

    it('GET /reporting/global-stats - Success for Admin', async () => {
      await request(app.getHttpServer())
        .get('/api/reporting/global-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('GET /reporting/global-stats - Forbidden for Teacher', async () => {
      await request(app.getHttpServer())
        .get('/api/reporting/global-stats')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });
  });

  describe('Admin Role Permissions', () => {
    it('Admin can create an student', async () => {
      // Need Etab, Niveau, Classe first (created by SuperAdmin)
      const etab = await request(app.getHttpServer())
        .post('/api/etablissement')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Admin Test Etab', address: 'Test', email: 'admin.etu@test.com', phone: '123' });
      
      const niv = await request(app.getHttpServer())
        .post('/api/niveau')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'L1 Admin' });

      const cls = await request(app.getHttpServer())
        .post('/api/classe')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Classe Admin', etablissementIds: [etab.body.data.id], niveauIds: [niv.body.data.id] });

      const parent = await request(app.getHttpServer())
        .post('/api/parents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'P', lastName: 'A', gender: 'Père', phoneNumber: '000' });

      await request(app.getHttpServer())
        .post('/api/etudiants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Etu', lastName: 'Admin', email: 'etu.admin@test.com', matricule: 'ETU-ADM-001',
          etablissementId: etab.body.data.id, classeId: cls.body.data.id, niveauId: niv.body.data.id,
          parentsData: [
            { firstName: 'P', lastName: 'A', gender: 'Père', phoneNumber: '000' }
          ]
        })
        .expect(201);
    });

    it('Teacher cannot create an student', async () => {
      await request(app.getHttpServer())
        .post('/api/etudiants')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ firstName: 'Fail' })
        .expect(403);
    });

    it('Admin can manage schedules', async () => {
      await request(app.getHttpServer())
        .get('/api/emploi-du-temps')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Enseignant Role Permissions', () => {
    it('Teacher can create an evaluation', async () => {
      // Use Base Mat and Base Niv (teacher is responsible for them)
      const mat = await matRepo.findOneBy({ code: 'BMAT' });
      const niv = await nivRepo.findOneBy({ name: 'Base Niv' });
      const etab = await etabRepo.findOneBy({ name: 'Base Etab' });
      
      const cls = await request(app.getHttpServer())
        .post('/api/classe')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Teacher Class', etablissementIds: [etab.id], niveauIds: [niv.id] });

      const annee = await request(app.getHttpServer())
        .post('/api/annee-universitaire')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ label: '2028-2029', startDate: '2028-10-01', endDate: '2029-07-31' });

      const sem = await request(app.getHttpServer())
        .post('/api/semestre')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'S1 Teach', startDate: '2028-10-01', endDate: '2029-02-28', anneeUniversitaireId: annee.body.data.id });

      await request(app.getHttpServer())
        .post('/api/evaluation')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'CC Teacher OK', type: 'Contrôle Continu', weight: 0.5, date: '2028-11-01',
          matiereId: mat.id, classeId: cls.body.data.id, niveauId: niv.id, semestreId: sem.body.data.id
        })
        .expect(201);
    });

    it('Teacher can upload a document', async () => {
      await request(app.getHttpServer())
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('teacher doc'), 'teacher.pdf')
        .field('title', 'Teacher PDF')
        .field('category', 'Pédagogique')
        .expect(201);
    });

    it('Teacher cannot delete an etablissement', async () => {
      const etabs = await request(app.getHttpServer()).get('/api/etablissement').set('Authorization', `Bearer ${adminToken}`);
      await request(app.getHttpServer())
        .delete(`/api/etablissement/${etabs.body.data[0].id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('Teacher cannot create evaluation for unassigned subject', async () => {
      const etab = await request(app.getHttpServer()).get('/api/etablissement').set('Authorization', `Bearer ${adminToken}`);
      const niv = await request(app.getHttpServer()).get('/api/niveau').set('Authorization', `Bearer ${adminToken}`);
      const cls = await request(app.getHttpServer()).get('/api/classe').set('Authorization', `Bearer ${adminToken}`);
      const mat = await request(app.getHttpServer())
        .post('/api/matiere')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Unassigned Math', code: 'UNMAT', coefficient: 2, classeIds: [cls.body.data[0].id], niveauIds: [niv.body.data[0].id] });
      
      const sem = await request(app.getHttpServer()).get('/api/semestre').set('Authorization', `Bearer ${adminToken}`);

      // Attempt to create evaluation for 'Unassigned Math' without Affectation
      await request(app.getHttpServer())
        .post('/api/evaluation')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Illegal CC', type: 'Contrôle Continu', weight: 0.5, date: '2027-11-01',
          matiereId: mat.body.data.id, classeId: cls.body.data[0].id, niveauId: niv.body.data[0].id, semestreId: sem.body.data[0].id
        })
        .expect(403); // Forbidden
    });
  });
});
