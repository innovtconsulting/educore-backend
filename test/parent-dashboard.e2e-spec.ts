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
  let etudiantId: number;
  let etablissementId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    // Nettoyage et création de données de test
    await dataSource.query(
      'TRUNCATE "user", "parent", "etudiant", "classe", "niveau", "etablissement", "matiere", "emploi_du_temp", "presence", "facture", "paiement" CASCADE',
    );

    const etablissement = await dataSource.query(
      "INSERT INTO etablissement (name, address, email) VALUES ('ESPM Test', 'Dakar', 'test@espm.sn') RETURNING id",
    );
    etablissementId = etablissement[0].id;
    const niveau = await dataSource.query(
      "INSERT INTO niveau (name) VALUES ('L1') RETURNING id",
    );
    const classe = await dataSource.query(
      "INSERT INTO classe (name) VALUES ('Informatique') RETURNING id",
    );

    // Lier classe et niveau/etablissement
    await dataSource.query(
      `INSERT INTO classe_etablissements_etablissement ("classeId", "etablissementId") VALUES (${classe[0].id}, ${etablissementId})`,
    );
    await dataSource.query(
      `INSERT INTO classe_niveaux_niveau ("classeId", "niveauId") VALUES (${classe[0].id}, ${niveau[0].id})`,
    );

    const etudiant = await dataSource.query(
      `INSERT INTO etudiant ("firstName", "lastName", "email", "matricule", "etablissementId", "classeId", "niveauId") VALUES ('Enfant', 'Test', 'enfant@test.com', 'MAT123', ${etablissementId}, ${classe[0].id}, ${niveau[0].id}) RETURNING id`,
    );
    etudiantId = etudiant[0].id;

    const parent = await dataSource.query(
      `INSERT INTO parent ("firstName", "lastName", "email", "phoneNumber", "gender") VALUES ('Parent', 'Test', 'parent@test.com', '123456', 'Père') RETURNING id`,
    );
    parentId = parent[0].id;

    // Lier parent et etudiant
    await dataSource.query(
      `INSERT INTO etudiant_parents_parent ("etudiantId", "parentId") VALUES (${etudiantId}, ${parentId})`,
    );

    // Créer une matière et un cours pour aujourd'hui
    const matiere = await dataSource.query(
      `INSERT INTO matiere (name, code, coefficient) VALUES ('Algorithmique', 'ALG101', 3) RETURNING id`,
    );
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const end = new Date(today);
    end.setHours(10, 0, 0, 0);

    const emploi = await dataSource.query(
      `INSERT INTO emploi_du_temp ("startTime", "endTime", "matiereId", "etablissementId", "classeId", "niveauId") VALUES ('${today.toISOString()}', '${end.toISOString()}', ${matiere[0].id}, ${etablissementId}, ${classe[0].id}, ${niveau[0].id}) RETURNING id`,
    );

    // Créer une absence pour aujourd'hui
    await dataSource.query(
      `INSERT INTO presence (status, "etudiantId", "emploiDuTempId") VALUES ('Absent', ${etudiantId}, ${emploi[0].id})`,
    );

    // Créer une facture impayée
    await dataSource.query(
      `INSERT INTO facture (numero, "montantTotal", status, "dateEmission", "etudiantId") VALUES ('FAC-001', 500000, 'Validée', NOW(), ${etudiantId})`,
    );

    // Créer un utilisateur parent
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    await dataSource.query(
      `INSERT INTO "user" (email, password, role, "parentId") VALUES ('parent@test.com', '${hashedPassword}', '${Role.PARENT}', ${parentId})`,
    );

    // Login pour obtenir le token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'parent@test.com', password: 'password123' });

    accessToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/parent-dashboard (GET) - Should return consolidated dashboard data', () => {
    return request(app.getHttpServer())
      .get('/parent-dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.parent.fullName).toBe('Parent Test');
        expect(res.body.children).toBeDefined();
        expect(res.body.children.length).toBe(1);
        const child = res.body.children[0];
        expect(child.fullName).toBe('Enfant Test');
        expect(child.presence.absentsTotal).toBe(1);
        expect(child.presence.absencesToday.length).toBe(1);
        expect(child.presence.absencesToday[0].matiere).toBe('Algorithmique');
        expect(child.finances.totalRemaining).toBe(500000);
        expect(child.finances.unpaidInvoicesCount).toBe(1);
      });
  });

  it('/parent-dashboard (GET) - Should fail without token', () => {
    return request(app.getHttpServer()).get('/parent-dashboard').expect(401);
  });
});
