import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Frais } from './entities/frais.entity';
import { Facture, InvoiceStatus } from './entities/facture.entity';
import { Paiement } from './entities/paiement.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { CreateFraisDto } from './dto/create-frais.dto';
import { CreateFactureDto } from './dto/create-facture.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import {
  generateQuittancePdf,
  generateReceiptPdf,
} from './utils/pdf-generator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Frais)
    public readonly fraisRepository: Repository<Frais>,
    @InjectRepository(Facture)
    public readonly factureRepository: Repository<Facture>,
    @InjectRepository(Paiement)
    public readonly paiementRepository: Repository<Paiement>,
    @InjectRepository(Etudiant)
    public readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Classe)
    public readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    public readonly niveauRepository: Repository<Niveau>,
  ) {}

  private enrichFactureWithPaymentSummary(facture: Facture) {
    const totalPaye = facture.paiements?.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    facture.montantPaye = totalPaye ?? 0;
    facture.montantRestant = Math.max(
      Number(facture.montantTotal) - (totalPaye ?? 0),
      0,
    );
  }

  // --- Gestion des Frais (Configuration) ---

  async createFrais(dto: CreateFraisDto, tenantId?: number) {
    const { classeId, niveauId, ...rest } = dto;
    const frais = this.fraisRepository.create({
      ...rest,
      etablissement: tenantId ? { id: tenantId } : undefined,
    });

    if (classeId) {
      const classe = await this.classeRepository.findOneBy({ id: classeId });
      if (!classe)
        throw new NotFoundException(`Classe #${classeId} introuvable`);
      frais.classe = classe;
    }

    if (niveauId) {
      const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
      if (!niveau)
        throw new NotFoundException(`Niveau #${niveauId} introuvable`);
      frais.niveau = niveau;
    }

    return await this.fraisRepository.save(frais);
  }

  async findAllFrais(tenantId?: number) {
    const where = TenantHelper.addTenantFilter({}, tenantId);

    return await this.fraisRepository.find({
      where: where,
      relations: { classe: true, niveau: true },
    });
  }

  async updateFrais(id: number, dto: CreateFraisDto, tenantId?: number) {
    const frais = await this.fraisRepository.findOne({ where: { id } });
    if (!frais) throw new NotFoundException('Frais introuvable');

    const { classeId, niveauId, ...rest } = dto;

    if (classeId) {
      const classe = await this.classeRepository.findOneBy({ id: classeId });
      if (!classe)
        throw new NotFoundException(`Classe #${classeId} introuvable`);
      frais.classe = classe;
    }

    if (niveauId) {
      const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
      if (!niveau)
        throw new NotFoundException(`Niveau #${niveauId} introuvable`);
      frais.niveau = niveau;
    }

    Object.assign(frais, rest);

    return await this.fraisRepository.save(frais);
  }

  async deleteFrais(id: number, tenantId?: number) {
    const frais = await this.fraisRepository.findOne({ where: { id } });
    if (!frais) throw new NotFoundException('Frais introuvable');

    await this.fraisRepository.remove(frais);
  }

  // --- Gestion des Factures ---

  async createFacture(dto: CreateFactureDto, tenantId?: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: TenantHelper.addTenantFilter({ id: dto.etudiantId }, tenantId),
      relations: { etablissement: true },
    });
    if (!etudiant)
      throw new NotFoundException(`Étudiant #${dto.etudiantId} introuvable`);

    const existing = await this.factureRepository.findOneBy({
      numero: dto.numero,
    });
    if (existing)
      throw new BadRequestException(`Facture ${dto.numero} déjà existante`);

    const facture = this.factureRepository.create({
      ...dto,
      etudiant,
      etablissement: etudiant.etablissement,
      dateEmission: new Date(dto.dateEmission),
      dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
    });

    const savedFacture = await this.factureRepository.save(facture);

    // Si la facture est créée directement comme payée, on génère la quittance
    if (savedFacture.status === InvoiceStatus.PAYE) {
      try {
        const factureWithEtab = await this.factureRepository.findOne({
          where: { id: savedFacture.id },
          relations: { etudiant: { etablissement: true } },
        });
        const quittancePath = await generateQuittancePdf(
          factureWithEtab || savedFacture,
        );
        savedFacture.quittancePath = quittancePath;
        await this.factureRepository.save(savedFacture);
      } catch (error) {
        console.error('Erreur génération quittance à la création:', error);
      }
    }

    return savedFacture;
  }

  async findAllFactures(
    paginationQuery: PaginationQueryDto,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const where = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiant.etablissement',
    );

    const [items, total] = await this.factureRepository.findAndCount({
      where: where,
      relations: { etudiant: true, paiements: true },
      order: { dateEmission: 'DESC' },
      skip,
      take: limit,
    });

    items.forEach((facture) => this.enrichFactureWithPaymentSummary(facture));

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOneFacture(id: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter(
      { id },
      tenantId,
      'etudiant.etablissement',
    );

    const facture = await this.factureRepository.findOne({
      where: where,
      relations: { etudiant: true, paiements: true },
    });
    if (!facture) throw new NotFoundException(`Facture #${id} introuvable`);
    this.enrichFactureWithPaymentSummary(facture);
    return facture;
  }

  async updateFacture(id: number, dto: CreateFactureDto, tenantId?: number) {
    const facture = await this.factureRepository.findOne({
      where: { id },
      relations: { etudiant: true },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');

    if (dto.etudiantId) {
      const etudiant = await this.etudiantRepository.findOne({
        where: TenantHelper.addTenantFilter({ id: dto.etudiantId }, tenantId),
      });
      if (!etudiant)
        throw new NotFoundException(`Étudiant #${dto.etudiantId} introuvable`);
      facture.etudiant = etudiant;
    }

    if (dto.numero) facture.numero = dto.numero;
    if (dto.dateEmission) facture.dateEmission = new Date(dto.dateEmission);
    if (dto.dateEcheance) facture.dateEcheance = new Date(dto.dateEcheance);
    if (dto.montantTotal) facture.montantTotal = dto.montantTotal;
    if (dto.notes) facture.notes = dto.notes;
    if (dto.status) facture.status = dto.status;

    return await this.factureRepository.save(facture);
  }

  async deleteFacture(id: number, tenantId?: number) {
    const facture = await this.factureRepository.findOne({
      where: { id },
      relations: { etudiant: true },
    });
    if (!facture) throw new NotFoundException('Facture introuvable');

    await this.factureRepository.remove(facture);
  }

  // --- Gestion des Paiements ---

  async createPaiement(dto: CreatePaiementDto, tenantId?: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: TenantHelper.addTenantFilter({ id: dto.etudiantId }, tenantId),
      relations: { etablissement: true },
    });
    if (!etudiant)
      throw new NotFoundException(`Étudiant #${dto.etudiantId} introuvable`);

    let facture: Facture | undefined;
    if (dto.factureId) {
      facture = await this.findOneFacture(dto.factureId, tenantId);
    }

    const existing = await this.paiementRepository.findOneBy({
      reference: dto.reference,
    });
    if (existing)
      throw new BadRequestException(
        `Référence paiement ${dto.reference} déjà utilisée`,
      );

    const paiement = this.paiementRepository.create({
      ...dto,
      etudiant,
      etablissement: etudiant.etablissement,
      facture,
      datePaiement: new Date(dto.datePaiement),
    });

    const savedPaiement = await this.paiementRepository.save(paiement);

    // Générer le reçu PDF
    try {
      const paiementWithEtab = await this.paiementRepository.findOne({
        where: { id: savedPaiement.id },
        relations: { etudiant: { etablissement: true } },
      });
      const recuPath = await generateReceiptPdf(
        paiementWithEtab || savedPaiement,
      );
      savedPaiement.recuPath = recuPath;
      await this.paiementRepository.save(savedPaiement);
    } catch (error) {
      console.error('Erreur lors de la génération du reçu PDF:', error);
    }

    // Mettre à jour le statut de la facture si liée
    if (facture) {
      await this.updateFactureStatus(facture.id);
    }

    return savedPaiement;
  }

  async updateFactureStatus(factureId: number) {
    const facture = await this.factureRepository.findOne({
      where: { id: factureId },
      relations: { paiements: true, etudiant: true },
    });

    if (!facture) return;

    const totalPaye = facture.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    const totalAuteur = Number(facture.montantTotal);

    if (totalPaye >= totalAuteur) {
      facture.status = InvoiceStatus.PAYE;
      // Générer la quittance finale
      try {
        const factureWithEtab = await this.factureRepository.findOne({
          where: { id: facture.id },
          relations: { etudiant: { etablissement: true } },
        });
        const quittancePath = await generateQuittancePdf(
          factureWithEtab || facture,
        );
        facture.quittancePath = quittancePath;
      } catch (error) {
        console.error('Erreur lors de la génération de la quittance:', error);
      }
    } else if (totalPaye > 0) {
      facture.status = InvoiceStatus.PARTIEL;
    } else {
      facture.status = InvoiceStatus.VALIDE;
    }

    await this.factureRepository.save(facture);
  }

  async findAllPaiements(
    paginationQuery: PaginationQueryDto,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const where = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiant.etablissement',
    );

    const [items, total] = await this.paiementRepository.findAndCount({
      where: where,
      relations: { etudiant: true, facture: true },
      order: { datePaiement: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async updatePaiement(id: number, dto: CreatePaiementDto, tenantId?: number) {
    const paiement = await this.paiementRepository.findOne({
      where: { id },
      relations: { etudiant: true, facture: true },
    });
    if (!paiement) throw new NotFoundException('Paiement introuvable');

    if (dto.etudiantId) {
      const etudiant = await this.etudiantRepository.findOne({
        where: TenantHelper.addTenantFilter({ id: dto.etudiantId }, tenantId),
      });
      if (!etudiant)
        throw new NotFoundException(`Étudiant #${dto.etudiantId} introuvable`);
      paiement.etudiant = etudiant;
    }

    if (dto.factureId) {
      const facture = await this.findOneFacture(dto.factureId, tenantId);
      paiement.facture = facture;
    }

    if (dto.reference) paiement.reference = dto.reference;
    if (dto.montant) paiement.montant = dto.montant;
    if (dto.datePaiement) paiement.datePaiement = new Date(dto.datePaiement);
    if (dto.modePaiement) paiement.modePaiement = dto.modePaiement;

    return await this.paiementRepository.save(paiement);
  }

  async deletePaiement(id: number, tenantId?: number) {
    const paiement = await this.paiementRepository.findOne({
      where: { id },
      relations: { etudiant: true },
    });
    if (!paiement) throw new NotFoundException('Paiement introuvable');

    await this.paiementRepository.remove(paiement);
  }

  // --- Tableau de Bord & Rapports ---

  async getDashboardStats(tenantId?: number) {
    // Pour le dashboard, si pas de tenantId, on ne filtre pas pour voir toutes les données
    const where = tenantId
      ? TenantHelper.addTenantFilter({}, tenantId, 'etudiant.etablissement')
      : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const allPaiements = await this.paiementRepository.find({
      where: where,
      relations: { etudiant: { niveau: true, classe: true } },
    });

    const totalCollected = allPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    // Pour "encaissé ce mois", utiliser le dernier mois qui a des paiements si le mois courant est vide
    let monthPaiements = allPaiements.filter(
      (p) => new Date(p.datePaiement) >= startOfMonth,
    );
    let monthCollected = monthPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    // Si pas de paiements ce mois, prendre le dernier mois avec des paiements
    if (monthPaiements.length === 0 && allPaiements.length > 0) {
      const latestPaymentDate = allPaiements.reduce((latest, p) => {
        const paymentDate = new Date(p.datePaiement);
        return paymentDate > latest ? paymentDate : latest;
      }, new Date(0));

      const startOfLastMonth = new Date(
        latestPaymentDate.getFullYear(),
        latestPaymentDate.getMonth(),
        1,
      );
      const endOfLastMonth = new Date(
        latestPaymentDate.getFullYear(),
        latestPaymentDate.getMonth() + 1,
        0,
      );

      monthPaiements = allPaiements.filter((p) => {
        const paymentDate = new Date(p.datePaiement);
        return paymentDate >= startOfLastMonth && paymentDate <= endOfLastMonth;
      });
      monthCollected = monthPaiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      );
    }

    const yearPaiements = allPaiements.filter(
      (p) => new Date(p.datePaiement) >= startOfYear,
    );
    const yearCollected = yearPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    const allFactures = await this.factureRepository.find({
      where: where,
      relations: { etudiant: { niveau: true, classe: true } },
    });

    const totalInvoiced = allFactures.reduce(
      (sum, f) => sum + Number(f.montantTotal),
      0,
    );

    const totalPending = totalInvoiced - totalCollected;

    // Calcul par niveau
    const statsByNiveau: any = {};
    allFactures.forEach((f) => {
      const niveauName = f.etudiant.niveau.name;
      if (!statsByNiveau[niveauName]) {
        statsByNiveau[niveauName] = {
          invoiced: 0,
          collected: 0,
          pending: 0,
          countFactures: 0,
          countStudents: new Set(),
        };
      }
      statsByNiveau[niveauName].invoiced += Number(f.montantTotal);
      statsByNiveau[niveauName].countFactures++;
      statsByNiveau[niveauName].countStudents.add(f.etudiant.id);
    });

    allPaiements.forEach((p) => {
      const niveauName = p.etudiant.niveau.name;
      if (statsByNiveau[niveauName]) {
        statsByNiveau[niveauName].collected += Number(p.montant);
      }
    });

    for (const niveauName in statsByNiveau) {
      statsByNiveau[niveauName].pending =
        statsByNiveau[niveauName].invoiced -
        statsByNiveau[niveauName].collected;
      statsByNiveau[niveauName].countStudents =
        statsByNiveau[niveauName].countStudents.size;
    }

    // Calcul par classe
    const statsByClasse: any = {};
    allFactures.forEach((f) => {
      const classeName = f.etudiant.classe.name;
      if (!statsByClasse[classeName]) {
        statsByClasse[classeName] = {
          invoiced: 0,
          collected: 0,
          pending: 0,
          countFactures: 0,
          countStudents: new Set(),
        };
      }
      statsByClasse[classeName].invoiced += Number(f.montantTotal);
      statsByClasse[classeName].countFactures++;
      statsByClasse[classeName].countStudents.add(f.etudiant.id);
    });

    allPaiements.forEach((p) => {
      const classeName = p.etudiant.classe.name;
      if (statsByClasse[classeName]) {
        statsByClasse[classeName].collected += Number(p.montant);
      }
    });

    for (const classe in statsByClasse) {
      statsByClasse[classe].pending =
        statsByClasse[classe].invoiced - statsByClasse[classe].collected;
      statsByClasse[classe].countStudents =
        statsByClasse[classe].countStudents.size;
    }

    // Calcul par mode de paiement
    const statsByPaymentMode: any = {};
    allPaiements.forEach((p) => {
      const mode = p.modePaiement;
      if (!statsByPaymentMode[mode]) {
        statsByPaymentMode[mode] = { count: 0, total: 0 };
      }
      statsByPaymentMode[mode].count++;
      statsByPaymentMode[mode].total += Number(p.montant);
    });

    // Statistiques de factures par statut
    const statsByStatus: any = {
      Brouillon: 0,
      Validée: 0,
      PartiellementPayée: 0,
      Payée: 0,
      Annulée: 0,
    };
    allFactures.forEach((f) => {
      if (statsByStatus[f.status] !== undefined) {
        statsByStatus[f.status]++;
      }
    });

    // Étudiants avec dettes
    const studentsWithDebt = new Map<number, any>();
    allFactures.forEach((f) => {
      const studentId = f.etudiant.id;
      const totalPaye = allPaiements
        .filter((p) => p.facture?.id === f.id)
        .reduce((sum, p) => sum + Number(p.montant), 0);
      const debt = Number(f.montantTotal) - totalPaye;

      if (debt > 0) {
        if (!studentsWithDebt.has(studentId)) {
          studentsWithDebt.set(studentId, {
            student: f.etudiant,
            totalDebt: 0,
            factures: [],
          });
        }
        const studentData = studentsWithDebt.get(studentId);
        studentData.totalDebt += debt;
        studentData.factures.push({
          numero: f.numero,
          debt: debt,
          status: f.status,
        });
      }
    });

    // Top 10 des plus gros débiteurs
    const topDebtors = Array.from(studentsWithDebt.values())
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 10);

    // Évolution mensuelle des paiements (6 derniers mois)
    const monthlyEvolution: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthPayments = allPaiements.filter(
        (p) =>
          new Date(p.datePaiement) >= monthDate &&
          new Date(p.datePaiement) <= monthEnd,
      );

      monthlyEvolution.push({
        month: monthDate.toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        }),
        amount: monthPayments.reduce((sum, p) => sum + Number(p.montant), 0),
        count: monthPayments.length,
      });
    }

    return {
      // Statistiques globales
      totalCollected,
      totalInvoiced,
      totalPending,
      monthCollected,
      yearCollected,
      countFactures: allFactures.length,
      countPaiements: allPaiements.length,
      countStudentsWithDebt: studentsWithDebt.size,

      // Ventilations
      statsByNiveau,
      statsByClasse,
      statsByPaymentMode,
      statsByStatus,

      // Liste des débiteurs
      topDebtors,

      // Évolution mensuelle
      monthlyEvolution,
    };
  }

  async getFinancialReport(start?: string, end?: string, tenantId?: number) {
    let where: any = {};
    if (start && end) {
      where.datePaiement = Between(new Date(start), new Date(end));
    }
    where = TenantHelper.addTenantFilter(
      where,
      tenantId,
      'etudiant.etablissement',
    );

    const paiements = await this.paiementRepository.find({
      where: where,
      relations: { etudiant: { niveau: true }, facture: true },
      order: { datePaiement: 'ASC' },
    });

    // Calculer les totaux pour le rapport
    const totalCollected = paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    // Récupérer les factures pour calculer le total facturé
    const facturesWhere = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiant.etablissement',
    );
    const factures = await this.factureRepository.find({
      where: facturesWhere,
      relations: { etudiant: { niveau: true } },
    });
    const totalInvoiced = factures.reduce(
      (sum, f) => sum + Number(f.montantTotal),
      0,
    );
    const totalPending = totalInvoiced - totalCollected;

    // Répartition par niveau pour le rapport
    const statsByNiveau: any = {};
    factures.forEach((f) => {
      if (!f.etudiant?.niveau?.name) return;
      const niveauName = f.etudiant.niveau.name;
      if (!statsByNiveau[niveauName]) {
        statsByNiveau[niveauName] = { invoiced: 0, collected: 0, pending: 0 };
      }
      statsByNiveau[niveauName].invoiced += Number(f.montantTotal);
    });

    paiements.forEach((p) => {
      if (!p.etudiant?.niveau?.name) return;
      const niveauName = p.etudiant.niveau.name;
      if (statsByNiveau[niveauName]) {
        statsByNiveau[niveauName].collected += Number(p.montant);
      }
    });

    for (const niveauName in statsByNiveau) {
      statsByNiveau[niveauName].pending =
        statsByNiveau[niveauName].invoiced -
        statsByNiveau[niveauName].collected;
    }

    return {
      period: { start, end },
      totalInvoiced,
      totalCollected,
      totalPending,
      count: paiements.length,
      data: paiements,
      statsByNiveau,
    };
  }

  async generateManualReceipt(paiementId: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter(
      { id: paiementId },
      tenantId,
      'etudiant.etablissement',
    );

    const paiement = await this.paiementRepository.findOne({
      where: where,
      relations: { etudiant: { etablissement: true }, facture: true },
    });
    if (!paiement)
      throw new NotFoundException(`Paiement #${paiementId} introuvable`);

    try {
      const recuPath = await generateReceiptPdf(paiement);
      paiement.recuPath = recuPath;
      return await this.paiementRepository.save(paiement);
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la génération manuelle du reçu',
      );
    }
  }

  async generateManualQuittance(factureId: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter(
      { id: factureId },
      tenantId,
      'etudiant.etablissement',
    );

    const facture = await this.factureRepository.findOne({
      where: where,
      relations: { etudiant: { etablissement: true } },
    });
    if (!facture)
      throw new NotFoundException(`Facture #${factureId} introuvable`);

    try {
      const quittancePath = await generateQuittancePdf(facture);
      facture.quittancePath = quittancePath;
      return await this.factureRepository.save(facture);
    } catch (error) {
      throw new BadRequestException(
        'Erreur lors de la génération manuelle de la quittance',
      );
    }
  }

  async getUnpaidFactures(
    classeId?: number,
    niveauId?: number,
    tenantId?: number,
  ) {
    const query = this.factureRepository
      .createQueryBuilder('facture')
      .leftJoinAndSelect('facture.etudiant', 'etudiant')
      .leftJoinAndSelect('etudiant.classe', 'classe')
      .leftJoinAndSelect('etudiant.niveau', 'niveau')
      .leftJoinAndSelect('facture.paiements', 'paiements')
      .where('facture.status IN (:...statuses)', {
        statuses: [InvoiceStatus.VALIDE, InvoiceStatus.PARTIEL],
      });

    if (tenantId)
      query.andWhere('etudiant.etablissementId = :tenantId', { tenantId });
    if (classeId) query.andWhere('classe.id = :classeId', { classeId });

    if (niveauId) {
      query.andWhere('niveau.id = :niveauId', { niveauId });
    }

    const factures = await query
      .orderBy('facture.dateEcheance', 'ASC')
      .getMany();
    factures.forEach((facture) =>
      this.enrichFactureWithPaymentSummary(facture),
    );
    return factures;

    // Calculer le montant restant pour chaque facture
    return factures.map((facture) => {
      const totalPaye = facture.paiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      );
      const montantRestant = Number(facture.montantTotal) - totalPaye;
      return {
        ...facture,
        montantRestant,
      };
    });
  }

  async findByEtudiant(etudiantId: number) {
    return await this.factureRepository.find({
      where: { etudiant: { id: etudiantId } },
      relations: { paiements: true },
      order: { dateEmission: 'DESC' },
    });
  }

  async generateAutoFactures(
    etudiantId: number,
    classeId: number,
    niveauId: number,
  ) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { etablissement: true },
    });
    if (!etudiant)
      throw new NotFoundException(`Étudiant #${etudiantId} introuvable`);

    const tenantId = etudiant.etablissement.id;

    // Récupérer les frais configurés pour ce duo classe/niveau
    const fraisList = await this.fraisRepository.find({
      where: {
        classe: { id: classeId },
        niveau: { id: niveauId },
        etablissement: { id: tenantId },
      },
    });

    if (fraisList.length === 0) {
      console.warn(
        `Aucun frais configuré pour Classe #${classeId} et Niveau #${niveauId}`,
      );
      return [];
    }

    const createdFactures: Facture[] = [];

    for (const frais of fraisList) {
      const numero = `FACT-${etudiant.id}-${Date.now()}-${frais.id}`;
      const facture = this.factureRepository.create({
        numero,
        notes: `Frais de ${frais.type} - Année Académique`,
        montantTotal: frais.amount,
        dateEmission: new Date(),
        status: InvoiceStatus.VALIDE,
        etudiant: etudiant,
      });

      const savedFacture = await this.factureRepository.save(facture);
      createdFactures.push(savedFacture);
    }

    return createdFactures;
  }
}
