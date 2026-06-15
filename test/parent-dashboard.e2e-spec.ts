import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/user/entities/user.entity';
import { DataSource } from 'typeorm';

describe('ParentDashboard (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let parentId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    // Nettoyage et création de données de test
    await dataSource.query('TRUNCATE "user", "parent", "etudiant", "classe", "niveau", "etablissement" CASCADE');

    const etablissement = await dataSource.query('INSERT INTO etablissement (name, address, email) VALUES (\'ESPM Test\', \'Dakar\', \'test@espm.sn\') RETURNING id');
    const niveau = await dataSource.query('INSERT INTO niveau (name) VALUES (\'L1\') RETURNING id');
    const classe = await dataSource.query('INSERT INTO classe (name) VALUES (\'Informatique\') RETURNING id');
    
    // Lier classe et niveau/etablissement (TypeORM relations)
    await dataSource.query(`INSERT INTO classe_etablissements_etablissement ("classeId", "etablissementId") VALUES (${classe[0].id}, ${etablissement[0].id})`);
    await dataSource.query(`INSERT INTO classe_niveaux_niveau ("classeId", "niveauId") VALUES (${classe[0].id}, ${niveau[0].id})`);

    const etudiant = await dataSource.query(`INSERT INTO etudiant ("firstName", "lastName", "email", "matricule", "etablissementId", "classeId", "niveauId") VALUES ('Enfant', 'Test', 'enfant@test.com', 'MAT123', ${etablissement[0].id}, ${classe[0].id}, ${niveau[0].id}) RETURNING id`);
    
    const parent = await dataSource.query(`INSERT INTO parent ("firstName", "lastName", "email", "phoneNumber", "gender") VALUES ('Parent', 'Test', 'parent@test.com', '123456', 'Père') RETURNING id`);
    parentId = parent[0].id;

    // Lier parent et etudiant
    await dataSource.query(`INSERT INTO etudiant_parents_parent ("etudiantId", "parentId") VALUES (${etudiant[0].id}, ${parentId})`);

    // Créer un utilisateur parent
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    await dataSource.query(`INSERT INTO "user" (email, password, role, "parentId") VALUES ('parent@test.com', '${hashedPassword}', '${Role.PARENT}', ${parentId})`);

    // Login pour obtenir le token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'parent@test.com', password: 'password123' });
    
    accessToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/parent-dashboard (GET) - Should return dashboard data for parent', () => {
    return request(app.getHttpServer())
      .get('/parent-dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.parent.fullName).toBe('Parent Test');
        expect(res.body.children).toBeDefined();
        expect(res.body.children.length).toBe(1);
        expect(res.body.children[0].fullName).toBe('Enfant Test');
      });
  });

  it('/parent-dashboard (GET) - Should fail without token', () => {
    return request(app.getHttpServer())
      .get('/parent-dashboard')
      .expect(401);
  });
});
