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
import { generateReceiptPdf } from './utils/pdf-generator';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Frais)
    private readonly fraisRepository: Repository<Frais>,
    @InjectRepository(Facture)
    private readonly factureRepository: Repository<Facture>,
    @InjectRepository(Paiement)
    private readonly paiementRepository: Repository<Paiement>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
  ) {}

  // --- Gestion des Frais (Configuration) ---

  async createFrais(dto: CreateFraisDto) {
    const { classeId, niveauId, ...rest } = dto;
    const frais = this.fraisRepository.create(rest);

    if (classeId) {
      const classe = await this.classeRepository.findOneBy({ id: classeId });
      if (!classe) throw new NotFoundException(`Classe #${classeId} introuvable`);
      frais.classe = classe;
    }

    if (niveauId) {
      const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
      if (!niveau) throw new NotFoundException(`Niveau #${niveauId} introuvable`);
      frais.niveau = niveau;
    }

    return await this.fraisRepository.save(frais);
  }

  async findAllFrais() {
    return await this.fraisRepository.find({
      relations: { classe: true, niveau: true },
    });
  }

  // --- Gestion des Factures ---

  async createFacture(dto: CreateFactureDto) {
    const etudiant = await this.etudiantRepository.findOneBy({
      id: dto.etudiantId,
    });
    if (!etudiant)
      throw new NotFoundException(`Étudiant #${dto.etudiantId} introuvable`);

    const existing = await this.factureRepository.findOneBy({
      numero: dto.numero,
    });
    if (existing) throw new BadRequestException(`Facture ${dto.numero} déjà existante`);

    const facture = this.factureRepository.create({
      ...dto,
      etudiant,
      dateEmission: new Date(dto.dateEmission),
      dateEcheance: dto.dateEcheance ? new Date(dto.dateEcheance) : undefined,
    });

    return await this.factureRepository.save(facture);
  }

  async findAllFactures() {
    return await this.factureRepository.find({
      relations: { etudiant: true, paiements: true },
      order: { dateEmission: 'DESC' },
    });
  }

  async findOneFacture(id: number) {
    const facture = await this.factureRepository.findOne({
      where: { id },
      relations: { etudiant: true, paiements: true },
    });
    if (!facture) throw new NotFoundException(`Facture #${id} introuvable`);
    return facture;
  }

  // --- Gestion des Paiements ---

  async createPaiement(dto: CreatePaiementDto) {
    const etudiant = await this.etudiantRepository.findOneBy({
      id: dto.etudiantId,
    });
    if (!etudiant)
      throw new NotFoundException(`Étudiant #${dto.etudiantId} introuvable`);

    let facture: Facture | undefined;
    if (dto.factureId) {
      facture = await this.findOneFacture(dto.factureId);
    }

    const existing = await this.paiementRepository.findOneBy({
      reference: dto.reference,
    });
    if (existing)
      throw new BadRequestException(`Référence paiement ${dto.reference} déjà utilisée`);

    const paiement = this.paiementRepository.create({
      ...dto,
      etudiant,
      facture,
      datePaiement: new Date(dto.datePaiement),
    });

    const savedPaiement = await this.paiementRepository.save(paiement);

    // Générer le reçu PDF
    try {
      const recuPath = await generateReceiptPdf(savedPaiement);
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
      relations: { paiements: true },
    });

    if (!facture) return;

    const totalPaye = facture.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    const totalAuteur = Number(facture.montantTotal);

    if (totalPaye >= totalAuteur) {
      facture.status = InvoiceStatus.PAYE;
    } else if (totalPaye > 0) {
      facture.status = InvoiceStatus.PARTIEL;
    } else {
      facture.status = InvoiceStatus.VALIDE;
    }

    await this.factureRepository.save(facture);
  }

  async findAllPaiements() {
    return await this.paiementRepository.find({
      relations: { etudiant: true, facture: true },
      order: { datePaiement: 'DESC' },
    });
  }

  // --- Tableau de Bord & Rapports ---

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allPaiements = await this.paiementRepository.find();
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

    const allFactures = await this.factureRepository.find();
    const totalInvoiced = allFactures.reduce(
      (sum, f) => sum + Number(f.montantTotal),
      0,
    );
    const totalPending = totalInvoiced - totalCollected;

    return {
      totalCollected,
      totalInvoiced,
      totalPending,
      monthCollected,
      countFactures: allFactures.length,
      countPaiements: allPaiements.length,
    };
  }

  async getFinancialReport(start?: string, end?: string) {
    const where: any = {};
    if (start && end) {
      where.datePaiement = Between(new Date(start), new Date(end));
    }

    const paiements = await this.paiementRepository.find({
      where,
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
}
