import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, Not, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Frais, FeeType } from './entities/frais.entity';
import { Facture, InvoiceStatus } from './entities/facture.entity';
import { Paiement } from './entities/paiement.entity';
import { Depense, DepenseCategory } from './entities/depense.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Parent } from '../parent/entities/parent.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { CreateFeeGroupDto } from './dto/create-fee-group.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateGlobalPaymentDto } from './dto/create-global-payment.dto';
import { CreateDepenseDto } from './dto/create-depense.dto';
import { UpdateDepenseDto } from './dto/update-depense.dto';
import { AnneeUniversitaireService } from '../annee-universitaire/annee-universitaire.service';
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
    @InjectRepository(Depense)
    public readonly depenseRepository: Repository<Depense>,
    @InjectRepository(Etudiant)
    public readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Parent)
    public readonly parentRepository: Repository<Parent>,
    @InjectRepository(Classe)
    public readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    public readonly niveauRepository: Repository<Niveau>,
    private readonly anneeUniversitaireService: AnneeUniversitaireService,
  ) {}

  private enrichFactureWithPaymentSummary(facture: Facture) {
    const totalPaye = (facture.paiements ?? []).reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );
    facture.montantPaye = totalPaye;
    facture.montantRestant = Math.max(
      Number(facture.montantTotal) - totalPaye,
      0,
    );
  }

  // --- Création d'un frais (avec scopes parcours/niveau) ---

  async createFeeGroup(dto: CreateFeeGroupDto, tenantId?: number) {
    if (!tenantId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    if (dto.type === FeeType.AUTRE && !dto.name) {
      throw new BadRequestException(
        'Le nom est obligatoire pour un frais de type "Autre"',
      );
    }

    if (dto.type === FeeType.ECOLAGE && !dto.mois) {
      throw new BadRequestException(
        'Le mois est obligatoire pour un frais de type "Écolage"',
      );
    }

    const anneeActive = await this.anneeUniversitaireService.getActiveYear(
      tenantId,
    );

    const groupeId = randomUUID();
    const name = dto.name || dto.type;

    const scopeRows: Frais[] = [];

    for (const scope of dto.scopes) {
      const classe = await this.classeRepository.findOne({
        where: { id: scope.classeId, etablissement: { id: tenantId } },
        relations: { niveaux: true },
      });
      if (!classe) {
        throw new NotFoundException(
          `Parcours #${scope.classeId} introuvable`,
        );
      }

      let niveaux: Niveau[];
      if (scope.allNiveaux) {
        niveaux = classe.niveaux ?? [];
      } else {
        const requestedIds = scope.niveauIds ?? [];
        niveaux = (classe.niveaux ?? []).filter((n) =>
          requestedIds.includes(n.id),
        );
        if (niveaux.length !== requestedIds.length) {
          throw new BadRequestException(
            `Un ou plusieurs niveaux sélectionnés n'appartiennent pas au parcours "${classe.name}"`,
          );
        }
      }

      // Règles métier sur les types de frais
      if (dto.type === FeeType.INSCRIPTION) {
        const l1niveaux = niveaux.filter((n) =>
          /^licence\s+1|^dut\s+1/i.test(n.name),
        );
        if (l1niveaux.length > 0) {
          throw new BadRequestException(
            `Les étudiants de "${l1niveaux[0].name}" ne paient pas de droit d'inscription. Veuillez sélectionner des niveaux supérieurs.`,
          );
        }
      }

      if (dto.type === FeeType.MEMOIRE) {
        const nonL3 = niveaux.filter(
          (n) => !/^licence\s+3/i.test(n.name),
        );
        if (nonL3.length > 0) {
          throw new BadRequestException(
            `Seuls les étudiants de Licence 3 sont concernés par le droit de mémoire. Le niveau "${nonL3[0].name}" n'est pas autorisé.`,
          );
        }
      }

      for (const niveau of niveaux) {
        scopeRows.push(
          this.fraisRepository.create({
            name,
            amount: dto.amount,
            type: dto.type,
            mois: dto.type === FeeType.ECOLAGE ? dto.mois : undefined,
            groupeId,
            classe,
            niveau,
            anneeUniversitaire: anneeActive,
            etablissementId: tenantId,
          }),
        );
      }
    }

    if (scopeRows.length === 0) {
      throw new BadRequestException(
        "Aucun parcours/niveau valide n'a été sélectionné",
      );
    }

    const savedScopeRows = await this.fraisRepository.save(scopeRows);

    // Générer les factures pour chaque étudiant déjà inscrit dans chaque scope
    const facturesToCreate: Facture[] = [];
    for (const frais of savedScopeRows) {
      const etudiants = await this.etudiantRepository.find({
        where: {
          classe: { id: frais.classe.id },
          niveau: { id: frais.niveau.id },
          etablissement: { id: tenantId },
        },
      });

      for (const etudiant of etudiants) {
        facturesToCreate.push(
          this.factureRepository.create({
            numero: `FACT-${anneeActive.label}-${frais.id}-${etudiant.id}`,
            frais,
            etudiantId: etudiant.id,
            etablissementId: tenantId,
            anneeUniversitaire: anneeActive,
            dateEmission: new Date(),
            dateEcheance: dto.dateEcheance
              ? new Date(dto.dateEcheance)
              : undefined,
            montantTotal: frais.amount,
            status: InvoiceStatus.VALIDE,
          }),
        );
      }
    }

    if (facturesToCreate.length > 0) {
      await this.factureRepository.save(facturesToCreate);
    }

    return this.findFeeGroupDetail(groupeId, tenantId);
  }

  // --- Liste des frais (groupés) ---

  async findAllFeeGroups(
    tenantId?: number,
    classeId?: number,
    niveauId?: number,
    type?: FeeType,
    anneeUniversitaireId?: number,
  ) {
    const where: any = {};
    if (tenantId) where.etablissementId = tenantId;
    if (classeId) where.classe = { id: classeId };
    if (niveauId) where.niveau = { id: niveauId };
    if (type) where.type = type;
    if (anneeUniversitaireId) where.anneeUniversitaireId = anneeUniversitaireId;

    const rows = await this.fraisRepository.find({
      where,
      relations: { classe: true, niveau: true, anneeUniversitaire: true },
      order: { createdAt: 'DESC' },
    });

    const groups = new Map<
      string,
      {
        groupeId: string;
        name: string;
        amount: number;
        type: string;
        mois?: number;
        anneeUniversitaire: any;
        scopesCount: number;
        createdAt: Date;
      }
    >();

    for (const row of rows) {
      if (!groups.has(row.groupeId)) {
        groups.set(row.groupeId, {
          groupeId: row.groupeId,
          name: row.name,
          amount: row.amount,
          type: row.type,
          mois: row.mois,
          anneeUniversitaire: row.anneeUniversitaire,
          scopesCount: 0,
          createdAt: row.createdAt,
        });
      }
      groups.get(row.groupeId)!.scopesCount++;
    }

    return Array.from(groups.values());
  }

  // --- Détail d'un frais : scopes + compteurs payé/total ---

  async findFeeGroupDetail(
    groupeId: string,
    tenantId?: number,
    classeId?: number,
    niveauId?: number,
  ) {
    const where: any = { groupeId };
    if (tenantId) where.etablissementId = tenantId;
    if (classeId) where.classe = { id: classeId };
    if (niveauId) where.niveau = { id: niveauId };

    const scopeRows = await this.fraisRepository.find({
      where,
      relations: { classe: true, niveau: true, anneeUniversitaire: true },
      order: { id: 'ASC' },
    });

    if (scopeRows.length === 0) {
      throw new NotFoundException('Frais introuvable');
    }

    const scopes = await Promise.all(
      scopeRows.map(async (frais) => {
        const totalStudents = await this.factureRepository.count({
          where: { fraisId: frais.id },
        });
        const paidStudents = await this.factureRepository.count({
          where: { fraisId: frais.id, status: InvoiceStatus.PAYE },
        });
        return {
          fraisId: frais.id,
          classe: frais.classe,
          niveau: frais.niveau,
          totalStudents,
          paidStudents,
        };
      }),
    );

    const first = scopeRows[0];
    return {
      groupeId,
      name: first.name,
      amount: first.amount,
      type: first.type,
      mois: first.mois,
      anneeUniversitaire: first.anneeUniversitaire,
      scopes,
    };
  }

  // --- Suppression d'un frais (tout le groupe) ---

  async deleteFeeGroup(groupeId: string, tenantId?: number) {
    const where: any = { groupeId };
    if (tenantId) where.etablissementId = tenantId;

    const scopeRows = await this.fraisRepository.find({ where });
    if (scopeRows.length === 0) {
      throw new NotFoundException('Frais introuvable');
    }

    const fraisIds = scopeRows.map((f) => f.id);
    const paiementsCount = await this.paiementRepository
      .createQueryBuilder('paiement')
      .innerJoin('paiement.facture', 'facture')
      .where('facture.fraisId IN (:...fraisIds)', { fraisIds })
      .getCount();

    if (paiementsCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer : des paiements ont déjà été enregistrés pour ce frais.',
      );
    }

    await this.fraisRepository.remove(scopeRows);
  }

  // --- Dépenses ---

  private validateDepensePayload(
    category: DepenseCategory | undefined,
    libelle: string | undefined,
  ) {
    if (category === DepenseCategory.AUTRE && !libelle) {
      throw new BadRequestException(
        'Le libellé est obligatoire pour une dépense de catégorie "Autre"',
      );
    }
  }

  async createDepense(dto: CreateDepenseDto, tenantId?: number) {
    if (!tenantId) {
      throw new BadRequestException("ID d'établissement manquant");
    }
    this.validateDepensePayload(dto.category, dto.libelle);

    const depense = this.depenseRepository.create({
      category: dto.category,
      libelle: dto.libelle,
      amount: dto.amount,
      date: new Date(dto.date),
      etablissementId: tenantId,
    });
    return await this.depenseRepository.save(depense);
  }

  async findAllPayments(
    tenantId?: number,
    start?: string,
    end?: string,
  ) {
    let where: any = {};
    if (start && end) where.datePaiement = Between(new Date(start), new Date(end));

    const relations = {
      etudiant: { classe: true, niveau: true, etablissement: true },
      facture: { frais: { classe: true, niveau: true, anneeUniversitaire: true } },
    };

    let payments = await this.paiementRepository.find({
      where,
      relations,
      order: { datePaiement: 'DESC', createdAt: 'DESC' },
    });

    if (tenantId) {
      payments = payments.filter((p) => p.etablissementId === tenantId);
    }

    return payments;
  }

  async findAllDepenses(
    tenantId?: number,
    start?: string,
    end?: string,
    category?: DepenseCategory,
  ) {
    let where: any = {};
    if (tenantId) where.etablissementId = tenantId;
    if (category) where.category = category;
    if (start && end) where.date = Between(new Date(start), new Date(end));

    return await this.depenseRepository.find({
      where,
      order: { date: 'DESC' },
    });
  }

  async updateDepense(id: number, dto: UpdateDepenseDto, tenantId?: number) {
    const where = TenantHelper.addTenantFilter({ id }, tenantId);
    const depense = await this.depenseRepository.findOne({ where });
    if (!depense) throw new NotFoundException(`Dépense #${id} introuvable`);

    this.validateDepensePayload(
      dto.category ?? depense.category,
      dto.libelle !== undefined ? dto.libelle : depense.libelle,
    );

    if (dto.category !== undefined) depense.category = dto.category;
    if (dto.libelle !== undefined) depense.libelle = dto.libelle;
    if (dto.amount !== undefined) depense.amount = dto.amount;
    if (dto.date !== undefined) depense.date = new Date(dto.date);

    return await this.depenseRepository.save(depense);
  }

  async deleteDepense(id: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter({ id }, tenantId);
    const depense = await this.depenseRepository.findOne({ where });
    if (!depense) throw new NotFoundException(`Dépense #${id} introuvable`);
    await this.depenseRepository.remove(depense);
  }

  // --- Étudiants + factures d'un scope (classe+niveau) ---

  async getFacturesByScope(
    fraisId: number,
    tenantId?: number,
    search?: string,
    status?: string,
  ) {
    const where: any = { id: fraisId };
    if (tenantId) where.etablissementId = tenantId;

    const frais = await this.fraisRepository.findOne({
      where,
      relations: { classe: true, niveau: true },
    });
    if (!frais) throw new NotFoundException('Frais introuvable');

    const baseWhere: any = { fraisId };
    if (status) {
      // "Impayée" est volontairement large côté métier : elle regroupe les
      // factures partiellement payées ET celles qui n'ont encore rien reçu.
      baseWhere.status =
        status === 'Impayée' ? Not(InvoiceStatus.PAYE) : status;
    }

    const factureWhere = search
      ? [
          { ...baseWhere, etudiant: { firstName: ILike(`%${search}%`) } },
          { ...baseWhere, etudiant: { lastName: ILike(`%${search}%`) } },
          { ...baseWhere, etudiant: { matricule: ILike(`%${search}%`) } },
        ]
      : baseWhere;

    const factures = await this.factureRepository.find({
      where: factureWhere,
      relations: { etudiant: true, paiements: true },
      order: { id: 'ASC' },
    });

    factures.forEach((f) => this.enrichFactureWithPaymentSummary(f));

    return { frais, factures };
  }

  // --- Une facture (avec historique complet des paiements) ---

  async findOneFacture(id: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter({ id }, tenantId);

    const facture = await this.factureRepository.findOne({
      where,
      relations: {
        etudiant: { etablissement: true },
        paiements: true,
        frais: { classe: true, niveau: true },
        anneeUniversitaire: true,
      },
    });
    if (!facture) throw new NotFoundException(`Facture #${id} introuvable`);

    facture.paiements = (facture.paiements ?? []).sort(
      (a, b) => a.tranche - b.tranche,
    );
    this.enrichFactureWithPaymentSummary(facture);
    return facture;
  }

  // --- Enregistrer un paiement (tranche) ---

  async createPaiementForFacture(
    factureId: number,
    dto: CreatePaymentDto,
    tenantId?: number,
  ) {
    const where = TenantHelper.addTenantFilter({ id: factureId }, tenantId);
    const facture = await this.factureRepository.findOne({
      where,
      relations: { etudiant: true, paiements: true },
    });
    if (!facture)
      throw new NotFoundException(`Facture #${factureId} introuvable`);

    const paiements = facture.paiements ?? [];
    if (paiements.length >= 3) {
      throw new BadRequestException(
        'Nombre maximum de tranches (3) déjà atteint pour cette facture.',
      );
    }

    const totalPaye = paiements.reduce((sum, p) => sum + Number(p.montant), 0);
    const montantRestant = Number(facture.montantTotal) - totalPaye;
    const EPSILON = 0.01;
    if (dto.montant > montantRestant + EPSILON) {
      throw new BadRequestException(
        `Le montant dépasse le solde restant (${montantRestant.toLocaleString('fr-FR')} Ar).`,
      );
    }

    const tranche = paiements.length + 1;
    const paiement = this.paiementRepository.create({
      reference: `PAY-${facture.numero}-T${tranche}`,
      etudiant: facture.etudiant,
      facture,
      etablissementId: facture.etablissementId,
      montant: dto.montant,
      datePaiement: new Date(dto.datePaiement),
      modePaiement: dto.modePaiement,
      tranche,
    });

    const savedPaiement = await this.paiementRepository.save(paiement);
    await this.updateFactureStatus(factureId);

    return savedPaiement;
  }

  // --- Paiements de plusieurs frais (multi-factures en une transaction) ---

  async createGlobalPayment(
    etudiantId: number,
    dto: CreateGlobalPaymentDto,
    tenantId?: number,
  ) {
    if (!tenantId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId, etablissement: { id: tenantId } },
    });
    if (!etudiant) {
      throw new NotFoundException(`Étudiant #${etudiantId} introuvable`);
    }

    const groupeReference = randomUUID();
    const paiementsCrees: Paiement[] = [];

    for (const alloc of dto.allocations) {
      const facture = await this.factureRepository.findOne({
        where: { id: alloc.factureId, etudiantId, etablissementId: tenantId },
        relations: { paiements: true },
      });
      if (!facture) {
        throw new NotFoundException(
          `Facture #${alloc.factureId} introuvable pour cet étudiant`,
        );
      }

      const paiements = facture.paiements ?? [];
      if (paiements.length >= 3) {
        throw new BadRequestException(
          `La facture #${facture.numero} a déjà atteint le nombre maximum de tranches (3).`,
        );
      }

      const totalPaye = paiements.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      );
      const montantRestant = Number(facture.montantTotal) - totalPaye;
      const EPSILON = 0.01;
      if (alloc.montant > montantRestant + EPSILON) {
        throw new BadRequestException(
          `Le montant alloué à la facture #${facture.numero} (${alloc.montant} Ar) dépasse le solde restant (${montantRestant.toLocaleString('fr-FR')} Ar).`,
        );
      }

      const tranche = paiements.length + 1;
      const paiement = this.paiementRepository.create({
        reference: `PAY-${facture.numero}-T${tranche}`,
        etudiant,
        facture,
        etablissementId: tenantId,
        montant: alloc.montant,
        datePaiement: new Date(dto.datePaiement),
        modePaiement: dto.modePaiement,
        tranche,
        groupeReference,
      });

      const saved = await this.paiementRepository.save(paiement);
      await this.updateFactureStatus(alloc.factureId);
      paiementsCrees.push(saved);
    }

    return {
      groupeReference,
      totalPaiements: paiementsCrees.length,
      montantTotal: paiementsCrees.reduce(
        (sum, p) => sum + Number(p.montant),
        0,
      ),
      paiements: paiementsCrees,
    };
  }

  async getPaymentsByGroupeReference(groupeReference: string, tenantId?: number) {
    const paiements = await this.paiementRepository.find({
      where: { groupeReference, etablissementId: tenantId },
      relations: { facture: { frais: { classe: true, niveau: true, anneeUniversitaire: true } }, etudiant: { etablissement: true, classe: true, niveau: true } },
      order: { id: 'ASC' },
    });

    if (paiements.length === 0) {
      throw new NotFoundException('Aucun paiement trouvé pour cette référence');
    }

    return {
      groupeReference,
      montantTotal: paiements.reduce((sum, p) => sum + Number(p.montant), 0),
      datePaiement: paiements[0].datePaiement,
      modePaiement: paiements[0].modePaiement,
      paiements,
    };
  }

  async getFacturesByEtudiant(etudiantId: number, tenantId?: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId, etablissement: { id: tenantId } },
      relations: { classe: true, niveau: true },
    });
    if (!etudiant) {
      throw new NotFoundException(`Étudiant #${etudiantId} introuvable`);
    }

    const factures = await this.factureRepository.find({
      where: { etudiantId, etablissementId: tenantId },
      relations: { frais: { classe: true, niveau: true }, paiements: true },
      order: { id: 'ASC' },
    });

    factures.forEach((f) => this.enrichFactureWithPaymentSummary(f));

    return { etudiant, factures };
  }

  async checkParentAccess(parentId: number, etudiantId: number): Promise<boolean> {
    const parent = await this.parentRepository.findOne({
      where: { id: parentId },
      relations: { etudiants: true },
    });
    return parent?.etudiants?.some((e) => e.id === etudiantId) ?? false;
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
    const totalAmount = Number(facture.montantTotal);

    if (totalPaye >= totalAmount) {
      facture.status = InvoiceStatus.PAYE;
    } else if (totalPaye > 0) {
      facture.status = InvoiceStatus.PARTIEL;
    } else {
      facture.status = InvoiceStatus.VALIDE;
    }

    await this.factureRepository.save(facture);
  }

  // --- Tableau de Bord & Rapports (conservés, adaptés minimalement) ---

  async getDashboardStats(tenantId?: number) {
    const where = tenantId
      ? TenantHelper.addTenantFilter({}, tenantId, 'etudiant.etablissement')
      : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const allPaiements = await this.paiementRepository.find({
      where,
      relations: { etudiant: { niveau: true, classe: true }, facture: true },
    });

    const totalCollected = allPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

    let monthPaiements = allPaiements.filter(
      (p) => new Date(p.datePaiement) >= startOfMonth,
    );
    let monthCollected = monthPaiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0,
    );

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
      where,
      relations: { etudiant: { niveau: true, classe: true }, frais: true },
    });

    const totalInvoiced = allFactures.reduce(
      (sum, f) => sum + Number(f.montantTotal),
      0,
    );

    const totalPending = totalInvoiced - totalCollected;

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
        statsByNiveau[niveauName].invoiced - statsByNiveau[niveauName].collected;
      statsByNiveau[niveauName].countStudents =
        statsByNiveau[niveauName].countStudents.size;
    }

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

    const statsByPaymentMode: any = {};
    allPaiements.forEach((p) => {
      const mode = p.modePaiement;
      if (!statsByPaymentMode[mode]) {
        statsByPaymentMode[mode] = { count: 0, total: 0 };
      }
      statsByPaymentMode[mode].count++;
      statsByPaymentMode[mode].total += Number(p.montant);
    });

    const statsByStatus: any = {
      Validée: 0,
      PartiellementPayée: 0,
      Payée: 0,
    };
    allFactures.forEach((f) => {
      if (statsByStatus[f.status] !== undefined) {
        statsByStatus[f.status]++;
      }
    });

    const studentsWithDebt = new Map<number, any>();
    // Étudiants en dette, regroupés par type de frais (Écolage, Inscription,
    // Scolarité, Examen, Autre) — un même étudiant peut apparaître dans
    // plusieurs types s'il a des dettes sur des frais de types différents.
    const studentsWithDebtByType = new Map<FeeType, Set<number>>();
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
          debt,
          status: f.status,
        });

        const feeType = f.frais?.type;
        if (feeType) {
          if (!studentsWithDebtByType.has(feeType)) {
            studentsWithDebtByType.set(feeType, new Set());
          }
          studentsWithDebtByType.get(feeType)!.add(studentId);
        }
      }
    });

    const countStudentsWithDebtByType = Object.values(FeeType).reduce(
      (acc, type) => {
        acc[type] = studentsWithDebtByType.get(type)?.size ?? 0;
        return acc;
      },
      {} as Record<FeeType, number>,
    );

    const topDebtors = Array.from(studentsWithDebt.values())
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 10);

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
      totalCollected,
      totalInvoiced,
      totalPending,
      monthCollected,
      yearCollected,
      countFactures: allFactures.length,
      countPaiements: allPaiements.length,
      countStudentsWithDebt: studentsWithDebt.size,
      countStudentsWithDebtByType,
      statsByNiveau,
      statsByClasse,
      statsByPaymentMode,
      statsByStatus,
      topDebtors,
      monthlyEvolution,
    };
  }

  async getFinancialReport(
    start?: string,
    end?: string,
    tenantId?: number,
    classeId?: number,
    niveauId?: number,
  ) {
    // Filtre étudiant partagé (parcours/niveau), fusionné avec le filtre tenant
    // par TenantHelper.addTenantFilter (deep-merge, ne s'écrasent pas entre eux).
    const etudiantFilter: any = {};
    if (classeId) etudiantFilter.classe = { id: classeId };
    if (niveauId) etudiantFilter.niveau = { id: niveauId };

    let paiementsWhere: any = {};
    if (start && end) {
      paiementsWhere.datePaiement = Between(new Date(start), new Date(end));
    }
    if (Object.keys(etudiantFilter).length > 0) {
      paiementsWhere.etudiant = etudiantFilter;
    }
    paiementsWhere = TenantHelper.addTenantFilter(
      paiementsWhere,
      tenantId,
      'etudiant.etablissement',
    );

    const paiements = await this.paiementRepository.find({
      where: paiementsWhere,
      relations: { etudiant: { niveau: true, classe: true }, facture: true },
      order: { datePaiement: 'ASC' },
    });

    const totalCollected = paiements.reduce((sum, p) => sum + Number(p.montant), 0);

    // Les factures sont bornées par leur date d'émission pour rester cohérentes
    // avec la période demandée (sinon "Total facturé" mélangerait des périodes).
    let facturesWhere: any = {};
    if (start && end) {
      facturesWhere.dateEmission = Between(new Date(start), new Date(end));
    }
    if (Object.keys(etudiantFilter).length > 0) {
      facturesWhere.etudiant = etudiantFilter;
    }
    facturesWhere = TenantHelper.addTenantFilter(
      facturesWhere,
      tenantId,
      'etudiant.etablissement',
    );
    const factures = await this.factureRepository.find({
      where: facturesWhere,
      relations: { etudiant: { niveau: true, classe: true } },
    });
    const totalInvoiced = factures.reduce(
      (sum, f) => sum + Number(f.montantTotal),
      0,
    );
    const totalPending = totalInvoiced - totalCollected;

    // --- Répartition par parcours, détaillée par niveau ---
    // (un niveau seul ne suffit pas à grouper : son nom - "L1", "L2"... - est
    // réutilisé d'un parcours à l'autre, donc on groupe d'abord par parcours)
    const statsByClasse: Record<
      string,
      {
        invoiced: number;
        collected: number;
        pending: number;
        niveaux: Record<string, { invoiced: number; collected: number; pending: number }>;
      }
    > = {};

    factures.forEach((f) => {
      const classeName = f.etudiant?.classe?.name;
      const niveauName = f.etudiant?.niveau?.name;
      if (!classeName || !niveauName) return;
      if (!statsByClasse[classeName]) {
        statsByClasse[classeName] = { invoiced: 0, collected: 0, pending: 0, niveaux: {} };
      }
      if (!statsByClasse[classeName].niveaux[niveauName]) {
        statsByClasse[classeName].niveaux[niveauName] = { invoiced: 0, collected: 0, pending: 0 };
      }
      statsByClasse[classeName].invoiced += Number(f.montantTotal);
      statsByClasse[classeName].niveaux[niveauName].invoiced += Number(f.montantTotal);
    });

    paiements.forEach((p) => {
      const classeName = p.etudiant?.classe?.name;
      const niveauName = p.etudiant?.niveau?.name;
      if (!classeName || !niveauName) return;
      if (statsByClasse[classeName]) {
        statsByClasse[classeName].collected += Number(p.montant);
        if (statsByClasse[classeName].niveaux[niveauName]) {
          statsByClasse[classeName].niveaux[niveauName].collected += Number(p.montant);
        }
      }
    });

    for (const classeName in statsByClasse) {
      const c = statsByClasse[classeName];
      c.pending = c.invoiced - c.collected;
      for (const niveauName in c.niveaux) {
        const n = c.niveaux[niveauName];
        n.pending = n.invoiced - n.collected;
      }
    }

    // --- Dépenses de la même période ---
    const depenses = await this.findAllDepenses(tenantId, start, end);
    const totalDepenses = depenses.reduce((sum, d) => sum + Number(d.amount), 0);

    const statsByCategory: any = {};
    depenses.forEach((d) => {
      if (!statsByCategory[d.category]) {
        statsByCategory[d.category] = { total: 0, count: 0 };
      }
      statsByCategory[d.category].total += Number(d.amount);
      statsByCategory[d.category].count++;
    });

    const netResult = totalCollected - totalDepenses;

    return {
      period: { start, end },
      totalInvoiced,
      totalCollected,
      totalPending,
      totalDepenses,
      netResult,
      count: paiements.length,
      data: paiements,
      statsByClasse,
      depenses,
      statsByCategory,
    };
  }

  async getUnpaidFactures(classeId?: number, niveauId?: number, tenantId?: number) {
    const query = this.factureRepository
      .createQueryBuilder('facture')
      .leftJoinAndSelect('facture.etudiant', 'etudiant')
      .leftJoinAndSelect('etudiant.classe', 'classe')
      .leftJoinAndSelect('etudiant.niveau', 'niveau')
      .leftJoinAndSelect('facture.paiements', 'paiements')
      .where('facture.status IN (:...statuses)', {
        statuses: [InvoiceStatus.VALIDE, InvoiceStatus.PARTIEL],
      });

    if (tenantId) query.andWhere('etudiant.etablissementId = :tenantId', { tenantId });
    if (classeId) query.andWhere('classe.id = :classeId', { classeId });
    if (niveauId) query.andWhere('niveau.id = :niveauId', { niveauId });

    const factures = await query.orderBy('facture.dateEmission', 'ASC').getMany();
    factures.forEach((facture) => this.enrichFactureWithPaymentSummary(facture));
    return factures;
  }

  async findByEtudiant(etudiantId: number) {
    return await this.factureRepository.find({
      where: { etudiantId },
      relations: { paiements: true },
      order: { dateEmission: 'DESC' },
    });
  }

  async hasPaidEcolage(etudiantId: number): Promise<boolean> {
    const factures = await this.factureRepository
      .createQueryBuilder('facture')
      .innerJoin('facture.frais', 'frais')
      .where('facture.etudiantId = :etudiantId', { etudiantId })
      .andWhere('frais.type = :type', { type: FeeType.ECOLAGE })
      .getMany();

    if (factures.length === 0) return false;

    return factures.every((f) => f.status === InvoiceStatus.PAYE);
  }
}
