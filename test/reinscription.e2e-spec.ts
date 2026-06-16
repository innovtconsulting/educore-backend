import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { EnrollmentStatus } from './../src/etudiant/entities/etudiant.entity';
import { InscriptionStatus } from './../src/etudiant/entities/inscription.entity';
import { InvoiceStatus } from './../src/finance/entities/facture.entity';
import { Role } from './../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('Réinscription (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

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

    // Seed Data
    const etabRepo = dataSource.getRepository('Etablissement');
    const nivRepo = dataSource.getRepository('Niveau');
    const clsRepo = dataSource.getRepository('Classe');
    const userRepo = dataSource.getRepository('User');
    const anneeRepo = dataSource.getRepository('AnneeUniversitaire');
    const fraisRepo = dataSource.getRepository('Frais');

    const etab = await etabRepo.save({ name: 'ESPM', address: 'Dakar', email: 'espm@test.com', phone: '123' });
    const nivL1 = await nivRepo.save({ name: 'L1' });
    const nivL2 = await nivRepo.save({ name: 'L2' });
    const clsInfo = await clsRepo.save({ name: 'Informatique' });
    await dataSource.createQueryBuilder().relation('Classe', 'etablissements').of(clsInfo).add(etab);
    await dataSource.createQueryBuilder().relation('Classe', 'niveaux').of(clsInfo).add([nivL1, nivL2]);

    const anneePassée = await anneeRepo.save({ label: '2025-2026', startDate: '2025-10-01', endDate: '2026-06-30', isActive: false });
    const anneeNouvelle = await anneeRepo.save({ label: '2026-2027', startDate: '2026-10-01', endDate: '2027-06-30', isActive: true });

    // Frais pour L2
    await fraisRepo.save({ name: 'Scolarité L2', amount: 500000, type: 'Scolarité', classe: clsInfo, niveau: nivL2, etablissement: etab });

    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await userRepo.save({ email: 'admin@espm.sn', password: hashedPassword, role: Role.ADMIN, etablissementId: etab.id, isActive: true });

    const loginRes = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'admin@espm.sn', password: 'password123' });
    adminToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fail reinscription if student has unpaid debts', async () => {
    const etuRepo = dataSource.getRepository('Etudiant');
    const insRepo = dataSource.getRepository('Inscription');
    const facRepo = dataSource.getRepository('Facture');

    const etudiant = await etuRepo.save({
      firstName: 'Alune', lastName: 'Diop', email: 'alune@test.com', status: EnrollmentStatus.ACTIF,
      etablissement: { id: 1 }, classe: { id: 1 }, niveau: { id: 1 }
    });

    await insRepo.save({
      etudiant, anneeUniversitaire: { id: 1 }, classe: { id: 1 }, niveau: { id: 1 }, etablissement: { id: 1 },
      status: InscriptionStatus.ACTIF
    });

    // Dette impayée
    await facRepo.save({
      numero: 'DEBT-001', designation: 'Dette L1', montantTotal: 100000, status: InvoiceStatus.VALIDE, etudiant,
      dateEmission: new Date()
    });

    const res = await request(app.getHttpServer())
      .post('/api/inscriptions/reinscrire')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etudiantId: etudiant.id, anneeUniversitaireId: 2, classeId: 1, niveauId: 2 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Dettes impayées détectées');
  });

  it('should allow reinscription if all criteria met (academic & financial)', async () => {
    const etuRepo = dataSource.getRepository('Etudiant');
    const insRepo = dataSource.getRepository('Inscription');
    const facRepo = dataSource.getRepository('Facture');

    const etudiant = await etuRepo.save({
      firstName: 'Moussa', lastName: 'Ndiaye', email: 'moussa@test.com', status: EnrollmentStatus.ACTIF,
      etablissement: { id: 1 }, classe: { id: 1 }, niveau: { id: 1 }
    });

    await insRepo.save({
      etudiant, anneeUniversitaire: { id: 1 }, classe: { id: 1 }, niveau: { id: 1 }, etablissement: { id: 1 },
      status: InscriptionStatus.ACTIF
    });

    // Facture payée
    await facRepo.save({
      numero: 'CLEAN-001', designation: 'Payé L1', montantTotal: 100000, status: InvoiceStatus.PAYE, etudiant,
      dateEmission: new Date()
    });

    // Mock des bulletins via le service (ou s'assurer qu'aucune donnée académique = éligible par défaut selon le service)
    const res = await request(app.getHttpServer())
      .post('/api/inscriptions/reinscrire')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ etudiantId: etudiant.id, anneeUniversitaireId: 2, classeId: 1, niveauId: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.message).toContain('Réinscription effectuée avec succès');

    // Vérifier mise à jour étudiant
    const updatedEtu = await etuRepo.findOne({
      where: { id: etudiant.id },
      relations: { niveau: true }
    });
    expect(updatedEtu?.niveau.id).toBe(2);

    // Vérifier génération facture auto
    const newInvoices = await facRepo.findBy({ etudiant: { id: etudiant.id }, status: InvoiceStatus.VALIDE });
    expect(newInvoices.length).toBeGreaterThan(0);
    expect(newInvoices[0].montantTotal).toBe("500000.00"); // Decimal precision in DB
  });

  it('should mark a student as graduated if all criteria met', async () => {
    const etuRepo = dataSource.getRepository('Etudiant');
    const insRepo = dataSource.getRepository('Inscription');
    const facRepo = dataSource.getRepository('Facture');

    const etudiant = await etuRepo.save({
      firstName: 'Fatou', lastName: 'Diagne', email: 'fatou@test.com', status: EnrollmentStatus.ACTIF,
      etablissement: { id: 1 }, classe: { id: 1 }, niveau: { id: 1 }
    });

    await insRepo.save({
      etudiant, anneeUniversitaire: { id: 1 }, classe: { id: 1 }, niveau: { id: 1 }, etablissement: { id: 1 },
      status: InscriptionStatus.ACTIF
    });

    // Facture payée
    await facRepo.save({
      numero: 'GRAD-001', designation: 'Payé Final', montantTotal: 100000, status: InvoiceStatus.PAYE, etudiant,
      dateEmission: new Date()
    });

    const res = await request(app.getHttpServer())
      .post(`/api/inscriptions/diplomer/${etudiant.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.message).toContain('marqué comme diplômé avec succès');

    // Vérifier statut étudiant
    const updatedEtu = await etuRepo.findOneBy({ id: etudiant.id });
    expect(updatedEtu?.status).toBe(EnrollmentStatus.DIPLOME);

    // Vérifier archivage inscription
    const updatedIns = await insRepo.findOneBy({ etudiant: { id: etudiant.id }, anneeUniversitaire: { id: 1 } });
    expect(updatedIns?.status).toBe(InscriptionStatus.TERMINE);
  });
});
