import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { FeeType } from './../src/finance/entities/frais.entity';
import { InvoiceStatus } from './../src/finance/entities/facture.entity';
import { PaymentMethod } from './../src/finance/entities/paiement.entity';

describe('Finance Module (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  let etudiantId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    dataSource = app.get(DataSource);

    // Clean state before tests
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }

    // Setup: Create Etab, Niveau, Classe, Parent, then Etudiant
    const etablissement = await request(app.getHttpServer())
      .post('/api/etablissement')
      .send({
        name: 'Etab Test Finance',
        address: 'Test',
        email: 'finance.test@email.sn',
        phone: '123456789',
      });
    const etablissementId = etablissement.body.data.id;

    const niveau = await request(app.getHttpServer())
      .post('/api/niveau')
      .send({ name: 'Niveau Test Finance' });
    const niveauId = niveau.body.data.id;

    const classe = await request(app.getHttpServer())
      .post('/api/classe')
      .send({
        name: 'Classe Test Finance',
        etablissementIds: [etablissementId],
        niveauIds: [niveauId],
      });
    const classeId = classe.body.data.id;

    const parent = await request(app.getHttpServer())
      .post('/api/parents')
      .send({
        firstName: 'Parent',
        lastName: 'Finance',
        gender: 'Tuteur',
        phoneNumber: '002',
      });
    const parentId = parent.body.data.id;

    const etudiant = await request(app.getHttpServer())
      .post('/api/etudiants')
      .send({
        firstName: 'Etudiant',
        lastName: 'Finance',
        email: 'finance.etu@email.sn',
        matricule: 'ETU-FIN-001',
        etablissementId,
        classeId,
        niveauId,
        parentIds: [parentId],
      });
    etudiantId = etudiant.body.data.id;
  });

  afterAll(async () => {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE;`);
    }
    await app.close();
  });

  it('1. Création d\'un frais configuré', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/frais')
      .send({
        name: 'Scolarité L1 Info',
        amount: 500000,
        type: FeeType.SCOLARITE,
      })
      .expect(201);
    
    expect(Number(res.body.data.amount)).toBe(500000);
  });

  let factureId: number;

  it('2. Émission d\'une facture', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/factures')
      .send({
        numero: 'FAC-2026-TEST-001',
        etudiantId,
        dateEmission: '2026-06-09',
        montantTotal: 500000,
      })
      .expect(201);
    
    factureId = res.body.data.id;
    expect(factureId).toBeDefined();
    expect(res.body.data.status).toBe(InvoiceStatus.BROUILLON);
  });

  it('3. Enregistrement d\'un paiement partiel', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/finance/paiements')
      .send({
        reference: 'PAY-TEST-001',
        etudiantId,
        factureId,
        montant: 200000,
        datePaiement: '2026-06-10',
        modePaiement: PaymentMethod.WAVE,
      })
      .expect(201);
    
    expect(Number(res.body.data.montant)).toBe(200000);
    expect(res.body.data.recuPath).toContain('.pdf');

    // Vérifier le statut de la facture
    const facRes = await request(app.getHttpServer())
      .get(`/api/finance/factures/${factureId}`)
      .expect(200);
    
    expect(facRes.body.data.status).toBe(InvoiceStatus.PARTIEL);
  });

  it('4. Enregistrement du paiement du solde', async () => {
    await request(app.getHttpServer())
      .post('/api/finance/paiements')
      .send({
        reference: 'PAY-TEST-002',
        etudiantId,
        factureId,
        montant: 300000,
        datePaiement: '2026-06-11',
        modePaiement: PaymentMethod.ORANGE_MONEY,
      })
      .expect(201);

    // Vérifier le statut de la facture
    const facRes = await request(app.getHttpServer())
      .get(`/api/finance/factures/${factureId}`)
      .expect(200);
    
    expect(facRes.body.data.status).toBe(InvoiceStatus.PAYE);
  });

  it('5. Consultation du tableau de bord', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/finance/dashboard')
      .expect(200);
    
    expect(res.body.data.totalCollected).toBe(500000);
    expect(res.body.data.totalInvoiced).toBe(500000);
    expect(res.body.data.totalPending).toBe(0);
  });

  it('6. Génération d\'un rapport financier', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/finance/report?start=2026-06-01&end=2026-06-30')
      .expect(200);
    
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.totalCollected).toBe(500000);
  });
});
