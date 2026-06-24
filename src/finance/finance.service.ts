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

  // --- Gestion des Factures ---

  async createFacture(dto: CreateFactureDto, tenantId?: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: TenantHelper.addTenantFilter({ id: dto.etudiantId }, tenantId),
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
    return facture;
  }

  // --- Gestion des Paiements ---

  async createPaiement(dto: CreatePaiementDto, tenantId?: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: TenantHelper.addTenantFilter({ id: dto.etudiantId }, tenantId),
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

  // --- Tableau de Bord & Rapports ---

  async getDashboardStats(tenantId?: number) {
    const where = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiant.etablissement',
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allPaiements = await this.paiementRepository.find({
      where: where,
      relations: { etudiant: { niveau: true } },
    });
    const totalCollected = allPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    const monthPaiements = allPaiements.filter(
      (p) => new Date(p.datePaiement) >= startOfMonth,
    );
    const monthCollected = monthPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    const allFactures = await this.factureRepository.find({
      where: where,
      relations: { etudiant: { niveau: true } },
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
        statsByNiveau[niveauName] = { invoiced: 0, collected: 0, pending: 0 };
      }
      statsByNiveau[niveauName].invoiced += Number(f.montantTotal);
    });

    allPaiements.forEach((p) => {
      const niveauName = p.etudiant.niveau.name;
      if (statsByNiveau[niveauName]) {
        statsByNiveau[niveauName].collected += Number(p.montant);
      }
    });

    for (const niveau in statsByNiveau) {
      statsByNiveau[niveau].pending =
        statsByNiveau[niveau].invoiced - statsByNiveau[niveau].collected;
    }

    return {
      totalCollected,
      totalInvoiced,
      totalPending,
      monthCollected,
      countFactures: allFactures.length,
      countPaiements: allPaiements.length,
      statsByNiveau,
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
      relations: { etudiant: true, facture: true },
      order: { datePaiement: 'ASC' },
    });

    return {
      period: { start, end },
      totalCollected: paiements.reduce((sum, p) => sum + Number(p.montant), 0),
      count: paiements.length,
      data: paiements,
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

    return await query.orderBy('facture.dateEcheance', 'ASC').getMany();
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
