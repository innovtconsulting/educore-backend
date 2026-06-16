import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('University Workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let superAdminToken: string;

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

    // Nettoyage et création d'un SuperAdmin pour les tests
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    await dataSource.getRepository('User').save({
      email: 'superadmin@test.com',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'superadmin@test.com', password: 'password123' });
    
    superAdminToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  let etablissementId: number;
  let l1Id: number;
  let l3Id: number;
  let informatiqueId: number;
  let infoL1Id: number;
  let algosId: number;
  let enseignantId: number;
  let affectationId: number;
  let salleId: number;
  let parentId: number;

  it('1. Création de l\'établissement (FST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/etablissement')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Faculté des Sciences et Techniques (FST)',
        address: 'UCAD, Dakar',
        email: 'contact.fst@ucad.edu.sn',
        phone: '+221 33 825 00 00',
      })
      .expect(201);
    
    etablissementId = res.body.data.id;
    expect(etablissementId).toBeDefined();
  });

  it('2. Création des niveaux (L1, L3)', async () => {
    const resL1 = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Licence 1' })
      .expect(201);
    l1Id = resL1.body.data.id;

    const resL3 = await request(app.getHttpServer())
      .post('/api/niveau')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Licence 3' })
      .expect(201);
    l3Id = resL3.body.data.id;

    expect(l1Id).toBeDefined();
    expect(l3Id).toBeDefined();
  });

  it('3. Création des classes (Informatique)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Informatique',
        niveauIds: [l1Id, l3Id],
        etablissementIds: [etablissementId],
      })
      .expect(201);
    
    informatiqueId = res.body.data.id;
    expect(informatiqueId).toBeDefined();
    expect(res.body.data.niveaux).toHaveLength(2);
  });

  it('4. Création des matières (Algorithmique)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/matiere')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'INF101',
        name: 'Algorithmique 1',
        coefficient: 4,
        classeIds: [informatiqueId],
        niveauIds: [l1Id],
      })
      .expect(201);
    
    algosId = res.body.data.id;
    expect(algosId).toBeDefined();
  });

  it('5. Création d\'un enseignant (Pr. Moussa Diallo)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/enseignants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Moussa',
        lastName: 'Diallo',
        email: 'moussa.diallo@ucad.edu.sn',
        phone: '+221 77 123 45 67',
        matricule: 'FST-INF-2026-001',
        dateEmbauche: '2026-01-01',
      })
      .expect(201);
    
    enseignantId = res.body.data.id;
    expect(enseignantId).toBeDefined();
  });

  it('6. Affectation de l\'enseignant à la matière', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/enseignants/${enseignantId}/affectations`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        matiereId: algosId,
        etablissementId: etablissementId,
        niveauId: l1Id,
      })
      .expect(201);
    
    affectationId = res.body.data.id;
    expect(affectationId).toBeDefined();
  });

  it('6.2. Création d\'un étudiant avec création automatique de parent', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/etudiants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Ousmane',
        lastName: 'Diallo',
        email: 'ousmane.diallo@email.sn',
        matricule: 'ETU-2026-001',
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
        parentsData: [
          {
            firstName: 'Jean',
            lastName: 'Diallo',
            gender: 'Père',
            phoneNumber: '771234567',
          },
        ],
      })
      .expect(201);
    expect(res.body.data.parents).toHaveLength(1);
    expect(res.body.data.parents[0].firstName).toBe('Jean');
  });

  it('6.3. Création d\'une salle', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/salles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Salle 101',
        capacity: 50,
        etablissementId: etablissementId,
      })
      .expect(201);
    
    salleId = res.body.data.id;
    expect(salleId).toBeDefined();
  });

  it('7. Création d\'un créneau d\'emploi du temps valide', async () => {
    const startTime = '2026-06-08T08:00:00.000Z';
    const endTime = '2026-06-08T10:00:00.000Z';

    const res = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime,
        endTime,
        matiereId: algosId,
        enseignantId: enseignantId,
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
        salleId: salleId,
      })
      .expect(201);
    
    expect(res.body.data.id).toBeDefined();
  });

  it('8. ÉCHEC : Création d\'un créneau avec conflit enseignant', async () => {
    const startTime = '2026-06-08T09:00:00.000Z'; // Chevauche le créneau précédent (08:00-10:00)
    const endTime = '2026-06-08T11:00:00.000Z';

    const res = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime,
        endTime,
        matiereId: algosId,
        enseignantId: enseignantId,
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
      })
      .expect(400);
    
    expect(res.body.message).toContain("L'enseignant a déjà un cours");
  });

  it('9. ÉCHEC : Création d\'un créneau pour un enseignant non affecté', async () => {
    // Création d'un autre enseignant
    const resEns = await request(app.getHttpServer())
      .post('/api/enseignants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Autre',
        lastName: 'Prof',
        email: 'autre.prof@ucad.edu.sn',
        matricule: 'FST-INF-2026-999',
        dateEmbauche: '2026-01-01',
      })
      .expect(201);
    const autreEnsId = resEns.body.data.id;

    const res = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime: '2026-06-09T08:00:00.000Z',
        endTime: '2026-06-09T10:00:00.000Z',
        matiereId: algosId,
        enseignantId: autreEnsId,
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
      })
      .expect(400);
    
    expect(res.body.message).toContain("L'enseignant n'est pas affecté");
  });

  it('10. ÉCHEC : Création d\'un créneau avec conflit classe', async () => {
    // Création d'un autre enseignant et affectation
    const resEns = await request(app.getHttpServer())
      .post('/api/enseignants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Mariam',
        lastName: 'Sow',
        email: 'mariam.sow@ucad.edu.sn',
        matricule: 'FST-INF-2026-002',
        dateEmbauche: '2026-01-01',
      })
      .expect(201);
    const mariamId = resEns.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/enseignants/${mariamId}/affectations`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        matiereId: algosId,
        etablissementId: etablissementId,
        niveauId: l1Id,
      })
      .expect(201);

    // Tentative de créer un cours pour Mariam avec la même classe (Informatique) sur le même créneau que Moussa (08:00-10:00)
    const res = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime: '2026-06-08T08:30:00.000Z',
        endTime: '2026-06-08T09:30:00.000Z',
        matiereId: algosId,
        enseignantId: mariamId,
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
      })
      .expect(400);
    
    expect(res.body.message).toContain("La classe est déjà occupée");
  });

  it('10.1. ÉCHEC : Création d\'un créneau avec conflit salle', async () => {
    // Création d'une autre classe pour éviter le conflit de classe
    const resCls = await request(app.getHttpServer())
      .post('/api/classe')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Mathématiques',
        niveauIds: [l1Id],
        etablissementIds: [etablissementId],
      })
      .expect(201);
    const mathId = resCls.body.data.id;

    // Lier la matière Algorithmique à la classe Mathématiques pour permettre le test de salle
    await request(app.getHttpServer())
      .patch(`/api/matiere/${algosId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        classeIds: [informatiqueId, mathId],
      })
      .expect(200);

    // Création d'un autre enseignant et affectation
    const resEns = await request(app.getHttpServer())
      .post('/api/enseignants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'Paul',
        lastName: 'Durand',
        email: 'paul.durand@ucad.edu.sn',
        matricule: 'FST-INF-2026-005',
        dateEmbauche: '2026-01-01',
      })
      .expect(201);
    const paulId = resEns.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/enseignants/${paulId}/affectations`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        matiereId: algosId,
        etablissementId: etablissementId,
        niveauId: l1Id,
      })
      .expect(201);

    // Tentative de créer un cours pour Paul dans la même salle (Salle 101) au même moment que le premier cours (qui était pour la classe Informatique)
    const res = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime: '2026-06-08T08:30:00.000Z',
        endTime: '2026-06-08T09:30:00.000Z',
        matiereId: algosId,
        enseignantId: paulId,
        etablissementId: etablissementId,
        classeId: mathId, // Nouvelle classe, donc pas de conflit classe
        niveauId: l1Id,
        salleId: salleId,
      })
      .expect(400);
    
    expect(res.body.message).toContain("La salle est déjà occupée");
  });

  it('10.2. ÉCHEC : Création d\'un créneau avec incohérence académique (Matière non liée)', async () => {
    // Créer une autre matière liée à une AUTRE classe/niveau
    const resMat = await request(app.getHttpServer())
      .post('/api/matiere')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'MAT-UNIQUE-999',
        name: 'Matière Inconnue',
        coefficient: 1,
        classeIds: [l3Id], // Pas liée à L1
        niveauIds: [l3Id], // Pas liée à L1
      })
      .expect(201);
    const fakeMatId = resMat.body.data.id;

    const res = await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime: '2026-06-20T10:00:00.000Z',
        endTime: '2026-06-20T12:00:00.000Z',
        matiereId: fakeMatId,
        enseignantId: enseignantId,
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
      })
      .expect(400);
    
    expect(res.body.message).toContain("pas prévue pour cette classe ou ce niveau");
  });

  it('11. Mise à jour d\'un créneau', async () => {
    // Récupérer le premier créneau
    const resAll = await request(app.getHttpServer())
      .get('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    const firstId = resAll.body.data.items[0].id;

    const newStartTime = '2026-06-08T14:00:00.000Z';
    const newEndTime = '2026-06-08T16:00:00.000Z';

    const res = await request(app.getHttpServer())
      .patch(`/api/emploi-du-temps/${firstId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime: newStartTime,
        endTime: newEndTime,
      })
      .expect(200);
    
    expect(new Date(res.body.data.startTime).toISOString()).toBe(newStartTime);
  });

  it('12. Suppression et Cascade', async () => {
    // Supprimer l'enseignant Moussa Diallo
    await request(app.getHttpServer())
      .delete(`/api/enseignants/${enseignantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    // Vérifier que ses affectations sont supprimées (Cascade)
    await request(app.getHttpServer())
      .post('/api/emploi-du-temps')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        startTime: '2026-06-10T08:00:00.000Z',
        endTime: '2026-06-10T10:00:00.000Z',
        matiereId: algosId,
        enseignantId: enseignantId,
        etablissementId: etablissementId,
        classeId: informatiqueId,
        niveauId: l1Id,
      })
      .expect(404);
  });
});

