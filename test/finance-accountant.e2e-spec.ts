import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Finance Accountant (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let comptableToken: string;
  let etudiantId: number;
  let factureId: number;

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
      email: 'accountant@test.com',
      password: passwordHash,
      role: Role.COMPTABLE,
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'accountant@test.com', password: 'password123' });
    comptableToken = login.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Accountant can create a fee (Frais)', async () => {
    await request(app.getHttpServer())
      .post('/api/finance/frais')
      .set('Authorization', `Bearer ${comptableToken}`)
      .send({ name: 'Scolarité L1', amount: 500000, type: 'Scolarité' })
      .expect(201);
  });

  it('Accountant can create an invoice (Facture)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/factures')
      .set('Authorization', `Bearer ${comptableToken}`)
      .send({
        numero: 'FAC-001',
        etudiantId,
        dateEmission: '2026-06-01',
        dateEcheance: '2026-07-01',
        montantTotal: 500000,
      })
      .expect(201);
    factureId = res.body.data.id;
  });

  it('Accountant can record a payment', async () => {
    await request(app.getHttpServer())
      .post('/api/finance/paiements')
      .set('Authorization', `Bearer ${comptableToken}`)
      .send({
        reference: 'PAY-001',
        etudiantId,
        factureId,
        montant: 200000,
        datePaiement: '2026-06-05',
        modePaiement: 'Wave',
      })
      .expect(201);
  });

  it('Accountant can create a DIRECTLY PAID invoice (Form approach)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/factures')
      .set('Authorization', `Bearer ${comptableToken}`)
      .send({
        numero: 'FAC-DIRECT-PAID',
        etudiantId,
        dateEmission: '2026-06-11',
        montantTotal: 150000,
        status: 'Payée',
        notes: "Payé cash à l'inscription",
      })
      .expect(201);

    expect(res.body.data.status).toBe('Payée');
    expect(res.body.data.quittancePath).toBeDefined();
    expect(res.body.data.quittancePath).toContain('quittance_FAC-DIRECT-PAID');
  });

  it('Accountant can generate a manual receipt for an existing payment', async () => {
    // We need a payment ID. Let's get the list.
    const list = await request(app.getHttpServer())
      .get('/api/finance/paiements')
      .set('Authorization', `Bearer ${comptableToken}`)
      .expect(200);

    const pId = list.body.data.items[0].id;

    const res = await request(app.getHttpServer())
      .post(`/api/finance/paiements/${pId}/generate-recu`)
      .set('Authorization', `Bearer ${comptableToken}`)
      .expect(201);

    expect(res.body.data.recuPath).toBeDefined();
  });

  it('Accountant can access unpaid list', async () => {
    await request(app.getHttpServer())
      .get('/api/finance/unpaid')
      .set('Authorization', `Bearer ${comptableToken}`)
      .expect(200);
  });

  it('Accountant can access financial dashboard', async () => {
    await request(app.getHttpServer())
      .get('/api/finance/dashboard')
      .set('Authorization', `Bearer ${comptableToken}`)
      .expect(200);
  });

  it('Accountant can generate financial report', async () => {
    await request(app.getHttpServer())
      .get('/api/finance/report')
      .set('Authorization', `Bearer ${comptableToken}`)
      .expect(200);
  });
});
