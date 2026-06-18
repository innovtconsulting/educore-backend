import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Devoir Submission (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let superAdminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let otherStudentToken: string;

  let etablissementId: number;
  let niveauId: number;
  let classeId: number;
  let matiereId: number;
  let teacherId: number;
  let studentId: number;
  let otherStudentId: number;
  let devoirId: number;
  let documentId: number;

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

    // Clean DB
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(
        `TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const userRepo = dataSource.getRepository('User');

    // Create SuperAdmin
    await userRepo.save({
      email: 'super@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });
    const loginSuper = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'super@test.com', password: 'password123' });
    superAdminToken = loginSuper.body.data.access_token;

    // Create Base Data
    const etabRes = await request(app.getHttpServer())
      .post('/api/etablissement')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Submission Etab',
        address: 'Test',
        email: 'sub@test.com',
        phone: '123',
      });
    etablissementId = etabRes.body.data.id;

    const nivRes = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'L1 Sub' });
    niveauId = nivRes.body.data.id;

    const clsRes = await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Info Sub',
        etablissementIds: [etablissementId],
        niveauIds: [niveauId],
      });
    classeId = clsRes.body.data.id;

    const matRes = await request(app.getHttpServer())
      .post('/api/matiere')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Algo Sub',
        code: 'ASUB',
        coefficient: 3,
        classeIds: [classeId],
        niveauIds: [niveauId],
      });
    matiereId = matRes.body.data.id;

    // Create Teacher
    const ensRes = await request(app.getHttpServer())
      .post('/api/enseignants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Ens',
        lastName: 'Sub',
        email: 'ens.sub@test.com',
        matricule: 'ENS-SUB',
        dateEmbauche: '2020-01-01',
      });
    teacherId = ensRes.body.data.id;
    await request(app.getHttpServer())
      .post(`/api/enseignants/${teacherId}/affectations`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ matiereId, etablissementId, niveauId });

    const loginEns = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ens.sub@test.com', password: '12345678' }); // Utilise le mot de passe par défaut
    teacherToken = loginEns.body.data.access_token;

    // Create Student
    const etuRes = await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Etu',
        lastName: 'Sub',
        email: 'etu.sub@test.com',
        matricule: 'ETU-SUB',
        etablissementId,
        classeId,
        niveauId,
        parentsData: [
          { firstName: 'P', lastName: 'S', gender: 'Père', phoneNumber: '000' },
        ],
      });
    studentId = etuRes.body.data.id;
    await userRepo.save({
      email: 'etu.sub@test.com',
      password: passwordHash,
      role: Role.ETUDIANT,
      etudiant: { id: studentId },
    });
    const loginEtu = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'etu.sub@test.com', password: 'password123' });
    studentToken = loginEtu.body.data.access_token;

    // Create Other Student (different class/level)
    const otherNivRes = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Other Niv' });
    const otherEtuRes = await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Other',
        lastName: 'Sub',
        email: 'other.sub@test.com',
        matricule: 'OTHER-SUB',
        etablissementId,
        classeId,
        niveauId: otherNivRes.body.data.id,
        parentsData: [
          { firstName: 'P', lastName: 'O', gender: 'Père', phoneNumber: '111' },
        ],
      });
    otherStudentId = otherEtuRes.body.data.id;
    await userRepo.save({
      email: 'other.sub@test.com',
      password: passwordHash,
      role: Role.ETUDIANT,
      etudiant: { id: otherStudentId },
    });
    const loginOther = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'other.sub@test.com', password: 'password123' });
    otherStudentToken = loginOther.body.data.access_token;

    // Create a Document for submission (Using Teacher Token as student might not have upload rights in DocumentController)
    const docRes = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
      .attach('file', Buffer.from('my submission'), 'rendu.pdf')
      .field('title', 'Rendu PDF')
      .field('category', 'Pédagogique');

    if (docRes.status !== 201) {
      console.error('Upload failed:', docRes.body);
    }
    documentId = docRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Enseignant crée un devoir', async () => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // 7 days from now

    const res = await request(app.getHttpServer())
      .post('/api/devoirs')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'TP Submission Test',
        description: 'Veuillez rendre votre travail.',
        deadline: deadline.toISOString(),
        matiereId,
        classeId,
        niveauId,
      })
      .expect(201);

    devoirId = res.body.data.id;
    expect(devoirId).toBeDefined();
  });

  it('2. Étudiant soumet son devoir (Succès)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/devoirs/${devoirId}/soumissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        documentId,
        comment: 'Voici mon travail.',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.comment).toBe('Voici mon travail.');
  });

  it('3. ÉCHEC : Autre étudiant soumet (Pas la bonne classe/niveau)', async () => {
    await request(app.getHttpServer())
      .post(`/api/devoirs/${devoirId}/soumissions`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        documentId,
      })
      .expect(403);
  });

  it('4. Étudiant récupère son propre rendu', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/devoirs/${devoirId}/soumissions/me`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.data.document.id).toBe(documentId);
  });

  it('5. Enseignant liste les rendus du devoir', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/devoirs/${devoirId}/soumissions`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].etudiant.id).toBe(studentId);
  });

  it('6. ÉCHEC : Soumission après deadline', async () => {
    // Créer un devoir avec deadline passée (via SQL car validation create bloquerait peut-être ou juste pour test)
    // On va modifier la deadline du devoir existant en base
    await dataSource
      .getRepository('Devoir')
      .update(devoirId, { deadline: new Date(Date.now() - 10000) });

    const res = await request(app.getHttpServer())
      .post(`/api/devoirs/${devoirId}/soumissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        documentId,
      })
      .expect(400);

    expect(res.body.message).toContain('dépassée');
  });

  it('7. Suppression du rendu (ÉCHEC si après deadline)', async () => {
    const meRes = await request(app.getHttpServer())
      .get(`/api/devoirs/${devoirId}/soumissions/me`)
      .set('Authorization', `Bearer ${studentToken}`);
    const submissionId = meRes.body.data.id;

    await request(app.getHttpServer())
      .delete(`/api/devoirs/soumissions/${submissionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(400);
  });
});
