import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { SiteStage } from './entities/site-stage.entity';
import { PeriodeStage } from './entities/periode-stage.entity';
import { AffectationStage, StageStatus } from './entities/affectation-stage.entity';
import { NatureStage } from './entities/nature-stage.entity';
import { CreateSiteStageDto } from './dto/create-site-stage.dto';
import { UpdateSiteStageDto } from './dto/update-site-stage.dto';
import { CreatePeriodeStageDto } from './dto/create-periode-stage.dto';
import { UpdatePeriodeStageDto } from './dto/update-periode-stage.dto';
import { CreateAffectationStageDto } from './dto/create-affectation-stage.dto';
import { UpdateAffectationStageDto } from './dto/update-affectation-stage.dto';
import { AffectationStageFilterDto } from './dto/affectation-stage-filter.dto';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Inscription } from '../etudiant/entities/inscription.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class SiteStageService {
  constructor(
    @InjectRepository(SiteStage)
    private readonly siteStageRepository: Repository<SiteStage>,
    @InjectRepository(PeriodeStage)
    private readonly periodeStageRepository: Repository<PeriodeStage>,
    @InjectRepository(AffectationStage)
    private readonly affectationRepository: Repository<AffectationStage>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,
    @InjectRepository(NatureStage)
    private readonly natureStageRepository: Repository<NatureStage>,
    @InjectRepository(Enseignant)
    private readonly enseignantRepository: Repository<Enseignant>,
    @InjectRepository(AnneeUniversitaire)
    private readonly anneeRepository: Repository<AnneeUniversitaire>,
    private readonly financeService: FinanceService,
  ) {}

  // ===================== SITES DE STAGE (Global) =====================

  async createSite(dto: CreateSiteStageDto, natureNames?: string[]): Promise<SiteStage> {
    const site = this.siteStageRepository.create({
      nom: dto.nom,
      adresse: dto.adresse,
      telephone: dto.telephone,
      email: dto.email,
      responsable: dto.responsable,
      description: dto.description,
      capacite: dto.capacite,
    });
    const savedSite = await this.siteStageRepository.save(site);

    if (natureNames && natureNames.length > 0) {
      const natures: NatureStage[] = [];
      for (const nom of natureNames) {
        const nature = await this.findOrCreateNature(nom);
        natures.push(nature);
      }
      savedSite.natures = natures;
      await this.siteStageRepository.save(savedSite);
    }

    return savedSite;
  }

  async findOrCreateNature(nom: string, description?: string): Promise<NatureStage> {
    const existing = await this.natureStageRepository.findOne({ where: { nom } });
    if (existing) return existing;
    const nature = this.natureStageRepository.create({ nom, description });
    return await this.natureStageRepository.save(nature);
  }

  async findAllSites(search?: string, natureStageId?: number, capaciteMin?: number): Promise<SiteStage[]> {
    const findOptions: any = {
      relations: { natures: true },
      order: { nom: 'ASC' },
    };
    if (search) {
      findOptions.where = [
        { nom: ILike(`%${search}%`) },
        { adresse: ILike(`%${search}%`) },
      ];
    }
    const sites = await this.siteStageRepository.find(findOptions);

    let filtered = sites;
    if (natureStageId) {
      filtered = filtered.filter(site => site.natures?.some(n => n.id === natureStageId));
    }
    if (capaciteMin) {
      filtered = filtered.filter(site => site.capacite != null && site.capacite >= capaciteMin);
    }
    return filtered;
  }

  async findOneSite(id: number): Promise<SiteStage> {
    const site = await this.siteStageRepository.findOne({
      where: { id },
      relations: { natures: true },
    });
    if (!site) {
      throw new NotFoundException(`Le site de stage #${id} n'a pas été trouvé`);
    }
    return site;
  }

  async updateSite(id: number, dto: UpdateSiteStageDto): Promise<SiteStage> {
    const site = await this.findOneSite(id);
    Object.assign(site, dto);
    return await this.siteStageRepository.save(site);
  }

  async removeSite(id: number): Promise<void> {
    const site = await this.findOneSite(id);
    await this.siteStageRepository.remove(site);
  }

  // ===================== PÉRIODES DE STAGE (Multi-tenant) =====================

  async createPeriode(
    dto: CreatePeriodeStageDto,
    tenantId?: number,
  ): Promise<PeriodeStage> {
    const annee = await this.anneeRepository.findOne({
      where: { id: dto.anneeUniversitaireId },
      relations: { etablissement: true },
    });
    if (!annee) {
      throw new NotFoundException("Année universitaire non trouvée");
    }

    const etablissementId = tenantId || annee.etablissementId;

    if (!etablissementId) {
      throw new NotFoundException('Établissement non trouvé');
    }

    const periode = this.periodeStageRepository.create({
      libelle: dto.libelle,
      dateDebut: new Date(dto.dateDebut),
      dateFin: new Date(dto.dateFin),
      anneeUniversitaireId: dto.anneeUniversitaireId,
      etablissementId,
    });

    return await this.periodeStageRepository.save(periode);
  }

  async findAllPeriodes(
    search?: string,
    tenantId?: number,
    anneeUniversitaireId?: number,
    dateDebutMin?: string,
    dateDebutMax?: string,
  ): Promise<PeriodeStage[]> {
    const where: any[] = [];
    const baseWhere: any = {};
    if (tenantId) {
      baseWhere.etablissementId = tenantId;
    }
    if (anneeUniversitaireId) {
      baseWhere.anneeUniversitaireId = anneeUniversitaireId;
    }
    if (dateDebutMin) {
      baseWhere.dateDebut = MoreThanOrEqual(new Date(dateDebutMin));
    }
    if (dateDebutMax) {
      const maxFilter = LessThanOrEqual(new Date(dateDebutMax));
      baseWhere.dateDebut = baseWhere.dateDebut
        ? { ...baseWhere.dateDebut, ...maxFilter }
        : maxFilter;
    }

    if (search) {
      where.push(
        { ...baseWhere, libelle: ILike(`%${search}%`) },
      );
    } else {
      where.push(baseWhere);
    }

    return await this.periodeStageRepository.find({
      where,
      relations: { anneeUniversitaire: true },
      order: { dateDebut: 'DESC' },
    });
  }

  async findOnePeriode(id: number, tenantId?: number): Promise<PeriodeStage> {
    const where: any = { id };
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    const periode = await this.periodeStageRepository.findOne({
      where,
      relations: { anneeUniversitaire: true },
    });
    if (!periode) {
      throw new NotFoundException(
        `La période de stage #${id} n'a pas été trouvée`,
      );
    }
    return periode;
  }

  async updatePeriode(
    id: number,
    dto: UpdatePeriodeStageDto,
    tenantId?: number,
  ): Promise<PeriodeStage> {
    const periode = await this.findOnePeriode(id, tenantId);
    if (dto.libelle !== undefined) periode.libelle = dto.libelle;
    if (dto.dateDebut !== undefined) periode.dateDebut = new Date(dto.dateDebut);
    if (dto.dateFin !== undefined) periode.dateFin = new Date(dto.dateFin);
    if (dto.anneeUniversitaireId !== undefined) {
      const annee = await this.anneeRepository.findOne({
        where: { id: dto.anneeUniversitaireId },
      });
      if (!annee) {
        throw new NotFoundException("Année universitaire non trouvée");
      }
      periode.anneeUniversitaireId = dto.anneeUniversitaireId;
    }
    return await this.periodeStageRepository.save(periode);
  }

  async removePeriode(id: number, tenantId?: number): Promise<void> {
    const periode = await this.findOnePeriode(id, tenantId);
    await this.periodeStageRepository.remove(periode);
  }

  // ===================== AFFECTATIONS (Multi-tenant) =====================

  async createAffectation(
    dto: CreateAffectationStageDto,
    tenantId?: number,
  ): Promise<AffectationStage> {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: dto.etudiantId },
      relations: { etablissement: true },
    });
    if (!etudiant) {
      throw new NotFoundException('Étudiant non trouvé');
    }

    const etablissementId = tenantId || etudiant.etablissement?.id;

    if (!etablissementId) {
      throw new NotFoundException('Établissement non trouvé');
    }

    const siteStage = await this.siteStageRepository.findOne({
      where: { id: dto.siteStageId },
    });
    if (!siteStage) {
      throw new NotFoundException('Site de stage non trouvé');
    }

    const periodeStage = await this.periodeStageRepository.findOne({
      where: { id: dto.periodeStageId },
    });
    if (!periodeStage) {
      throw new NotFoundException('Période de stage non trouvée');
    }

    if (dto.natureStageId) {
      const natureStage = await this.natureStageRepository.findOne({
        where: { id: dto.natureStageId },
      });
      if (!natureStage) {
        throw new NotFoundException('Nature de stage non trouvée');
      }
    }

    if (dto.enseignantId) {
      const enseignant = await this.enseignantRepository.findOne({
        where: { id: dto.enseignantId },
      });
      if (!enseignant) {
        throw new NotFoundException('Enseignant non trouvé');
      }
    }

    const existing = await this.affectationRepository.findOne({
      where: {
        etudiantId: dto.etudiantId,
        periodeStageId: dto.periodeStageId,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Cet étudiant est déjà affecté à un site pour cette période',
      );
    }

    const affectation = this.affectationRepository.create({
      etudiantId: dto.etudiantId,
      siteStageId: dto.siteStageId,
      periodeStageId: dto.periodeStageId,
      service: dto.service,
      natureStageId: dto.natureStageId,
      enseignantId: dto.enseignantId,
      statut: StageStatus.EN_ATTENTE,
      etablissementId,
    });

    return await this.affectationRepository.save(affectation);
  }

  async findAllAffectations(
    filter: AffectationStageFilterDto,
    tenantId?: number,
  ): Promise<{
    items: AffectationStage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, ...filters } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.affectationRepository
      .createQueryBuilder('affectation')
      .leftJoinAndSelect('affectation.etudiant', 'etudiant')
      .leftJoinAndSelect('affectation.siteStage', 'siteStage')
      .leftJoinAndSelect('affectation.periodeStage', 'periodeStage')
      .leftJoinAndSelect('affectation.natureStage', 'natureStage')
      .leftJoinAndSelect('affectation.enseignant', 'enseignant')
      .leftJoinAndSelect('affectation.etablissement', 'etablissement');

    if (tenantId) {
      queryBuilder.andWhere('affectation.etablissementId = :tenantId', {
        tenantId,
      });
    }

    if (filters.siteStageId) {
      queryBuilder.andWhere('affectation.siteStageId = :siteStageId', {
        siteStageId: filters.siteStageId,
      });
    }
    if (filters.periodeStageId) {
      queryBuilder.andWhere('affectation.periodeStageId = :periodeStageId', {
        periodeStageId: filters.periodeStageId,
      });
    }
    if (filters.etudiantId) {
      queryBuilder.andWhere('affectation.etudiantId = :etudiantId', {
        etudiantId: filters.etudiantId,
      });
    }
    if (filters.natureStageId) {
      queryBuilder.andWhere('affectation.natureStageId = :natureStageId', {
        natureStageId: filters.natureStageId,
      });
    }
    if (filters.statut) {
      queryBuilder.andWhere('affectation.statut = :statut', {
        statut: filters.statut,
      });
    }
    if (filters.enseignantId) {
      queryBuilder.andWhere('affectation.enseignantId = :enseignantId', {
        enseignantId: filters.enseignantId,
      });
    }
    if (search) {
      queryBuilder.andWhere(
        '(etudiant.firstName ILIKE :search OR etudiant.lastName ILIKE :search OR etudiant.matricule ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('affectation.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async getGrilleAffectations(
    anneeUniversitaireId: number,
    search?: string,
    page = 1,
    limit = 20,
    tenantId?: number,
    classeIds?: number[],
    niveauId?: number,
    siteStageId?: number,
    natureStageId?: number,
    all = false,
  ): Promise<{
    items: any[];
    periodes: PeriodeStage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const tenantFilter = tenantId ? { etablissementId: tenantId } : {};

    const periodes = await this.periodeStageRepository.find({
      where: { anneeUniversitaireId, ...tenantFilter },
      order: { dateDebut: 'ASC' },
    });

    if (periodes.length === 0) {
      return { items: [], periodes: [], total: 0, page, limit };
    }

    const periodeIds = periodes.map((p) => p.id);
    const affectationWhere: any = { periodeStageId: In(periodeIds), ...tenantFilter };
    if (siteStageId) affectationWhere.siteStageId = siteStageId;
    if (natureStageId) affectationWhere.natureStageId = natureStageId;

    const affectations = await this.affectationRepository.find({
      where: affectationWhere,
      relations: {
        etudiant: true,
        siteStage: true,
        natureStage: true,
        enseignant: true,
        periodeStage: true,
      },
    });

    const studentMap = new Map<number, any>();
    for (const aff of affectations) {
      if (!aff.etudiant) continue;
      const eId = aff.etudiant.id;
      if (!studentMap.has(eId)) {
        studentMap.set(eId, {
          etudiant: aff.etudiant,
          affectations: {},
        });
      }
      const entry = studentMap.get(eId)!;
      const idx = periodes.findIndex((p) => p.id === aff.periodeStageId);
      if (idx !== -1) {
        entry.affectations[`stage${idx + 1}`] = {
          id: aff.id,
          siteStage: aff.siteStage,
          natureStage: aff.natureStage,
          service: aff.service,
          statut: aff.statut,
          enseignant: aff.enseignant,
          dateAffectation: aff.dateAffectation,
        };
      }
    }

    let studentIds = Array.from(studentMap.keys());

    // Attach classe/niveau info when exporting all
    const classeNiveauMap = new Map<number, { classeName: string; niveauName: string }>();
    const hasClasseFilter = !!classeIds && classeIds.length > 0;

    if (all || hasClasseFilter || niveauId) {
      const inscriptionFilter: any = { anneeUniversitaire: { id: anneeUniversitaireId } };
      if (hasClasseFilter) inscriptionFilter.classe = { id: In(classeIds!) };
      if (niveauId) inscriptionFilter.niveau = { id: niveauId };
      if (tenantId) inscriptionFilter.etablissement = { id: tenantId };

      const inscriptions = await this.inscriptionRepository.find({
        where: inscriptionFilter,
        relations: { etudiant: true, classe: true, niveau: true },
      });

      if (hasClasseFilter || niveauId) {
        const filteredIds = new Set(inscriptions.map((ins) => ins.etudiant.id));
        studentIds = studentIds.filter((id) => filteredIds.has(id));
      }

      if (all) {
        for (const ins of inscriptions) {
          classeNiveauMap.set(ins.etudiant.id, {
            classeName: ins.classe?.name ?? '',
            niveauName: ins.niveau?.name ?? '',
          });
        }
      }
    }

    let students = studentIds.map((id) => {
      const s = studentMap.get(id)!;
      if (all) {
        const cn = classeNiveauMap.get(id);
        if (cn) {
          s.classeName = cn.classeName;
          s.niveauName = cn.niveauName;
        }
      }
      return s;
    });

    if (search) {
      const q = search.toLowerCase();
      students = students.filter(
        (s) =>
          s.etudiant.firstName.toLowerCase().includes(q) ||
          s.etudiant.lastName.toLowerCase().includes(q) ||
          (s.etudiant.matricule && s.etudiant.matricule.toLowerCase().includes(q)),
      );
    }

    const total = students.length;
    const skip = all ? 0 : (page - 1) * limit;
    const items = all ? students : students.slice(skip, skip + limit);

    return { items, periodes, total, page: all ? 1 : page, limit: all ? total : limit };
  }

  async findOneAffectation(
    id: number,
    tenantId?: number,
  ): Promise<AffectationStage> {
    const where: any = { id };
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    const affectation = await this.affectationRepository.findOne({
      where,
      relations: {
        etudiant: true,
        siteStage: true,
        periodeStage: true,
        natureStage: true,
        enseignant: true,
      },
    });
    if (!affectation) {
      throw new NotFoundException(
        `L'affectation de stage #${id} n'a pas été trouvée`,
      );
    }
    return affectation;
  }

  async findByEtudiant(
    etudiantId: number,
    tenantId?: number,
  ): Promise<AffectationStage[]> {
    const where: any = { etudiantId };
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    return await this.affectationRepository.find({
      where,
      relations: {
        siteStage: true,
        periodeStage: true,
        natureStage: true,
        enseignant: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySite(
    siteStageId: number,
    tenantId?: number,
  ): Promise<AffectationStage[]> {
    const where: any = { siteStageId };
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    return await this.affectationRepository.find({
      where,
      relations: {
        etudiant: true,
        periodeStage: true,
        natureStage: true,
        enseignant: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async updateAffectation(
    id: number,
    dto: UpdateAffectationStageDto,
    tenantId?: number,
  ): Promise<AffectationStage> {
    const affectation = await this.findOneAffectation(id, tenantId);

    if (dto.etudiantId !== undefined && dto.etudiantId !== affectation.etudiantId) {
      const etudiant = await this.etudiantRepository.findOne({
        where: TenantHelper.addTenantFilter(
          { id: dto.etudiantId },
          tenantId,
          'etablissement',
        ),
      });
      if (!etudiant) {
        throw new NotFoundException('Étudiant non trouvé');
      }

      const conflict = await this.affectationRepository.findOne({
        where: {
          etudiantId: dto.etudiantId,
          periodeStageId: affectation.periodeStageId,
        },
      });
      if (conflict) {
        throw new ConflictException(
          'Cet étudiant est déjà affecté à un site pour cette période',
        );
      }

      affectation.etudiantId = dto.etudiantId;
      affectation.etudiant = etudiant;
    }

    if (dto.siteStageId !== undefined) {
      const siteStage = await this.siteStageRepository.findOne({
        where: { id: dto.siteStageId },
      });
      if (!siteStage) {
        throw new NotFoundException('Site de stage non trouvé');
      }
      if (siteStage.capacite) {
        const count = await this.affectationRepository.count({
          where: { siteStageId: dto.siteStageId, periodeStageId: affectation.periodeStageId },
        });
        if (count >= siteStage.capacite) {
          throw new BadRequestException('Capacité maximale atteinte pour ce site');
        }
      }
      affectation.siteStageId = dto.siteStageId;
      affectation.siteStage = siteStage;
    }

    if (dto.service !== undefined) {
      affectation.service = dto.service;
    }

    if (dto.natureStageId !== undefined) {
      const natureStage = await this.natureStageRepository.findOne({
        where: { id: dto.natureStageId },
      });
      if (!natureStage) {
        throw new NotFoundException('Nature de stage non trouvée');
      }
      affectation.natureStageId = dto.natureStageId;
      affectation.natureStage = natureStage;
    }

    if (dto.enseignantId !== undefined && dto.enseignantId !== null) {
      const enseignant = await this.enseignantRepository.findOne({
        where: TenantHelper.addTenantFilter(
          { id: dto.enseignantId },
          tenantId,
          'etablissement',
        ),
      });
      if (!enseignant) {
        throw new NotFoundException('Enseignant non trouvé');
      }
      affectation.enseignantId = dto.enseignantId;
      affectation.enseignant = enseignant;
    } else if (dto.enseignantId === null) {
      affectation.enseignantId = null as any;
      affectation.enseignant = null as any;
    }

    if (dto.statut !== undefined) {
      affectation.statut = dto.statut;
    }

    await this.affectationRepository.save(affectation);
    return await this.findOneAffectation(id, tenantId);
  }

  async removeAffectation(id: number, tenantId?: number): Promise<void> {
    const affectation = await this.findOneAffectation(id, tenantId);
    await this.affectationRepository.remove(affectation);
  }

  // ===================== NATURES DE STAGE =====================

  async createNatureStage(dto: { nom: string; description?: string }): Promise<NatureStage> {
    const existing = await this.natureStageRepository.findOne({ where: { nom: dto.nom } });
    if (existing) return existing;
    const nature = this.natureStageRepository.create({ nom: dto.nom, description: dto.description });
    return await this.natureStageRepository.save(nature);
  }

  async findAllNaturesStage(): Promise<NatureStage[]> {
    return await this.natureStageRepository.find({ order: { nom: 'ASC' } });
  }

  async findOneNatureStage(id: number): Promise<NatureStage> {
    const nature = await this.natureStageRepository.findOne({ where: { id } });
    if (!nature) {
      throw new NotFoundException(`La nature de stage #${id} n'a pas été trouvée`);
    }
    return nature;
  }

  async updateNatureStage(id: number, dto: { nom?: string; description?: string }): Promise<NatureStage> {
    const nature = await this.findOneNatureStage(id);
    if (dto.nom !== undefined) nature.nom = dto.nom;
    if (dto.description !== undefined) nature.description = dto.description;
    return await this.natureStageRepository.save(nature);
  }

  async removeNatureStage(id: number): Promise<void> {
    const nature = await this.findOneNatureStage(id);
    await this.natureStageRepository.remove(nature);
  }

  // ===================== AUTO-ASSIGN =====================

  async autoAssignStage(
    etudiantId: number,
    classeId: number,
    niveauId: number,
    etablissementId: number,
    siteStageId?: number,
    overwrite = false,
  ): Promise<AffectationStage[]> {
    const anneeActive = await this.anneeRepository.findOne({
      where: { etablissementId, isActive: true },
    });
    if (!anneeActive) return [];

    const periodes = await this.periodeStageRepository.find({
      where: { anneeUniversitaireId: anneeActive.id, etablissementId },
      order: { dateDebut: 'ASC' },
    });
    if (periodes.length === 0) return [];

    const allSites = await this.siteStageRepository.find({ order: { nom: 'ASC' } });
    if (allSites.length === 0) return [];

    const results: AffectationStage[] = [];

    for (const periode of periodes) {
      const existing = await this.affectationRepository.findOne({
        where: { etudiantId, periodeStageId: periode.id },
      });
      if (existing) {
        if (overwrite) {
          await this.affectationRepository.remove(existing);
        } else {
          continue;
        }
      }

      let site: SiteStage | null = null;
      if (siteStageId) {
        site = allSites.find((s) => s.id === siteStageId) || null;
      }
      if (!site) {
        const shuffled = [...allSites].sort(() => Math.random() - 0.5);
        for (const s of shuffled) {
          if (s.capacite) {
            const count = await this.affectationRepository.count({
              where: { siteStageId: s.id, periodeStageId: periode.id },
            });
            if (count >= s.capacite) continue;
          }
          site = s;
          break;
        }
      }
      if (!site) continue;

      const natureIds = site.natures?.map((n) => n.id) || [];
      const natureStageId = natureIds.length > 0
        ? natureIds[Math.floor(Math.random() * natureIds.length)]
        : undefined;

      const affectation = this.affectationRepository.create({
        etudiantId,
        siteStageId: site.id,
        periodeStageId: periode.id,
        natureStageId,
        statut: StageStatus.ACTIF,
        etablissementId,
      });
      results.push(await this.affectationRepository.save(affectation));
    }

    return results;
  }

  async autoAssignAll(tenantId?: number): Promise<number> {
    const anneeActive = await this.anneeRepository.findOne({
      where: { etablissementId: tenantId, isActive: true },
    });
    if (!anneeActive) return 0;

    const whereClause: any = {};
    if (tenantId) whereClause.etablissement = { id: tenantId };
    const etudiants = await this.etudiantRepository.find({
      where: whereClause,
      relations: { classe: true, niveau: true, etablissement: true },
    });
    if (etudiants.length === 0) return 0;

    let total = 0;
    for (const etudiant of etudiants) {
      if (!etudiant.classe?.id || !etudiant.niveau?.id) continue;
      try {
        const eId = tenantId ?? etudiant.etablissement?.id;
        if (!eId) continue;
        const affs = await this.autoAssignStage(
          etudiant.id,
          etudiant.classe.id,
          etudiant.niveau.id,
          eId,
          undefined,
          true,
        );
        total += affs.length;
      } catch {
        // ignorer les erreurs individuelles
      }
    }
    return total;
  }

  async reassignStage(
    affectationId: number,
    siteStageId: number,
    tenantId?: number,
  ): Promise<AffectationStage> {
    const affectation = await this.affectationRepository.findOne({
      where: { id: affectationId },
      relations: { siteStage: true, periodeStage: true },
    });
    if (!affectation) {
      throw new NotFoundException('Affectation introuvable');
    }

    const site = await this.siteStageRepository.findOne({ where: { id: siteStageId } });
    if (!site) {
      throw new NotFoundException('Site introuvable');
    }

    if (site.capacite) {
      const count = await this.affectationRepository.count({
        where: { siteStageId: site.id, periodeStageId: affectation.periodeStage.id },
      });
      if (count >= site.capacite) {
        throw new BadRequestException('Capacité maximale atteinte pour ce site');
      }
    }

    affectation.siteStage = site;
    affectation.siteStageId = site.id;
    return await this.affectationRepository.save(affectation);
  }

  // ===================== IMPORT RÉPARTITION XLSX =====================

  async importRepartitionSheet(
    worksheet: any,
    headers: string[],
    sheetName: string,
    tenantId?: number,
    _batchSize = 500,
  ): Promise<{ sheetName: string; affectationsCreated: number; studentsCreated: number; erreurs: string[] }> {
    const erreurs: string[] = [];

    // 1) Détecter le format de la feuille
    const hasNumCol = headers.some(h => /^n[°°]?\s*$|^num(e(ro)?)?$/i.test((h || '').trim()));
    const nameCol = hasNumCol ? 2 : 1;
    const progCol = hasNumCol ? 3 : 2;
    const typeCol = hasNumCol ? 4 : 3;
    const stageStartCol = hasNumCol ? 5 : 4;

    const getCellText = (row: any, col: number): string => {
      try {
        const cell = row.getCell(col);
        if (cell.text !== undefined && cell.text !== null) {
          return cell.text.toString().trim();
        }
        if (cell.value !== null && cell.value !== undefined) {
          return String(cell.value).trim();
        }
      } catch {
        // gestion des cellules fusionnées
      }
      return '';
    };

    // 2) Parcourir les lignes pour construire des groupes d'étudiants
    // Chaque groupe = { name, prog, date:{col->val}, lieu:{}, service:{}, nature:{} }
    interface StageGroup {
      name: string;
      prog: string;
      date: Map<number, string>;
      lieu: Map<number, string>;
      service: Map<number, string>;
      nature: Map<number, string>;
    }

    const groups: StageGroup[] = [];
    let current: StageGroup | null = null;

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const nameVal = getCellText(row, nameCol);
      const progVal = getCellText(row, progCol);
      const typeRaw = getCellText(row, typeCol);
      const type = typeRaw.toLowerCase().replace(/[^a-z]/g, '');

      if (!['date', 'lieu', 'service', 'nature'].includes(type)) continue;

      if (!nameVal) {
        if (!current) continue;
      } else if (!current || nameVal !== current.name) {
        current = { name: nameVal, prog: progVal, date: new Map(), lieu: new Map(), service: new Map(), nature: new Map() };
        groups.push(current);
      }

      // Lire les colonnes de stage
      const target = type === 'date' ? current.date : type === 'lieu' ? current.lieu : type === 'service' ? current.service : current.nature;
      for (let c = stageStartCol; c <= Math.min(row.cellCount || 20, 20); c++) {
        const val = getCellText(row, c);
        if (val) {
          target.set(c - stageStartCol + 1, val);
        }
      }
    }

    if (groups.length === 0) {
      return { sheetName, affectationsCreated: 0, studentsCreated: 0, erreurs: ['Aucune donnée trouvée dans cette feuille'] };
    }

    // 3) Charger les références
    const allStudents = await this.etudiantRepository.find({
      relations: { etablissement: true },
    });
    const allSites = await this.siteStageRepository.find({ select: { id: true, nom: true } });
    const allNatures = await this.natureStageRepository.find({ select: { id: true, nom: true } });
    const allPeriodes = tenantId
      ? await this.periodeStageRepository.find({ where: { etablissementId: tenantId }, select: { id: true, libelle: true } })
      : await this.periodeStageRepository.find({ select: { id: true, libelle: true } });
    const existingAffectations = tenantId
      ? await this.affectationRepository.find({ where: { etablissementId: tenantId }, select: { id: true, etudiantId: true, periodeStageId: true } })
      : [];
    const anneeActive = await this.anneeRepository.findOne({
      where: { etablissementId: tenantId || 1, isActive: true },
      select: { id: true },
    });

    // Indexer les étudiants par nom normalisé
    const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const studentMap = new Map<string, Etudiant>();
    for (const s of allStudents) {
      const full = normalizeName(`${s.firstName} ${s.lastName}`);
      studentMap.set(full, s);
    }

    const siteMap = new Map<string, SiteStage>();
    for (const s of allSites) siteMap.set(s.nom.toLowerCase().trim(), s);

    const natureMap = new Map<string, NatureStage>();
    for (const n of allNatures) natureMap.set(n.nom.toLowerCase().trim(), n);

    const periodeMap = new Map<string, PeriodeStage>();
    for (const p of allPeriodes) periodeMap.set(p.libelle, p);

    const affectationKey = (eid: number, pid: number) => `${eid}::${pid}`;
    const existingAffectationMap = new Map<string, AffectationStage>();
    for (const a of existingAffectations) {
      existingAffectationMap.set(affectationKey(a.etudiantId, a.periodeStageId), a);
    }

    // 4) Traiter chaque groupe
    const affectationsToCreate: AffectationStage[] = [];
    const affectationsToUpdate: Array<{ id: number; siteStageId: number; service?: string; statut: StageStatus; natureStageId?: number }> = [];
    const siteNaturesMap = new Map<number, Set<number>>();
    const studentsCreated: Etudiant[] = [];

    const splitName = (full: string): { firstName: string; lastName: string } => {
      const parts = full.trim().split(/\s+/);
      if (parts.length <= 1) return { firstName: parts[0] || full, lastName: '' };
      // Dernier mot = lastName, le reste = firstName
      const lastName = parts.pop()!;
      return { firstName: parts.join(' '), lastName };
    };

    // Vérifie si les caractères du code apparaissent en ordre dans le nom (ex: "IG" → "Imagerie")
    const matchesSeq = (code: string, name: string): boolean => {
      const c = code.toLowerCase();
      const n = name.toLowerCase();
      let ci = 0;
      for (const nc of n) {
        if (nc === c[ci] && ++ci >= c.length) return true;
      }
      return false;
    };

    // Résoudre (et créer si besoin) la classe et le niveau depuis le nom de la feuille
    // Formats supportés : "IG L1", "IG_L3", "IG-L1", "IG L1 (2)"
    const classeRepo = this.etudiantRepository.manager.getRepository('Classe') as any;
    const niveauRepo = this.etudiantRepository.manager.getRepository('Niveau') as any;

    const findOrCreateClasseNiveau = async (classeCode: string, niveauCode: string, etablissementId: number): Promise<{ classe: any; niveau: any } | null> => {
      const cc = classeCode.toLowerCase();
      const nc = niveauCode.toLowerCase();

      // Chercher dans la DB
      const allClasses = await classeRepo.find({ where: { etablissement: { id: etablissementId } } });
      const allNiveaux = await niveauRepo.find({ where: { etablissement: { id: etablissementId } } });

      let classe = allClasses.find((c: any) => c.name.toLowerCase() === cc)
        || allClasses.find((c: any) => c.name.toLowerCase().includes(cc))
        || allClasses.find((c: any) => matchesSeq(cc, c.name));

      let niveau = allNiveaux.find((n: any) => n.name.toLowerCase() === nc)
        || allNiveaux.find((n: any) => n.name.toLowerCase().includes(nc))
        || allNiveaux.find((n: any) => matchesSeq(nc, n.name));

      // Créer la classe si introuvable
      if (!classe) {
        classe = classeRepo.create({ name: classeCode.toUpperCase(), etablissement: { id: etablissementId } });
        classe = await classeRepo.save(classe);
      }
      // Créer le niveau si introuvable
      if (!niveau) {
        niveau = niveauRepo.create({ name: niveauCode.toUpperCase(), classe: classe.id, etablissement: { id: etablissementId }, etablissementId });
        niveau = await niveauRepo.save(niveau);
      }

      return { classe, niveau };
    };

    const classeNiveauFromSheet = async (sn: string, etablissementId: number): Promise<{ classe: any; niveau: any } | null> => {
      let clean = sn.trim();
      clean = clean.replace(/\s*\(.*\)\s*$/, '').trim();
      const match = clean.match(/^(.+?)[\s_-]*([LMD]\d+)$/i);
      if (!match) return null;
      return findOrCreateClasseNiveau(match[1].trim(), match[2].toUpperCase(), etablissementId);
    };

    const findOrCreateStudent = async (name: string, etablissementId: number, sheetName?: string): Promise<Etudiant | null> => {
      const key = normalizeName(name);
      // essai exact
      let s = studentMap.get(key);
      if (s) return s;
      // essai par sous-chaîne
      for (const [k, v] of studentMap) {
        if (k.includes(key) || key.includes(k)) {
          studentMap.set(key, v);
          return v;
        }
      }
      // création automatique
      const cn = sheetName ? await classeNiveauFromSheet(sheetName, etablissementId) : null;
      if (!cn) return null;
      const { firstName, lastName } = splitName(name);
      const newStudent = this.etudiantRepository.create({
        firstName,
        lastName,
        etablissement: { id: etablissementId } as any,
        classe: cn.classe,
        niveau: cn.niveau,
      });
      const saved = await this.etudiantRepository.save(newStudent);
      studentMap.set(key, saved);
      studentsCreated.push(saved);
      return saved;
    };

    const findOrCreateSite = async (nom: string): Promise<SiteStage> => {
      const key = nom.toLowerCase().trim();
      let s = siteMap.get(key);
      if (!s) {
        s = this.siteStageRepository.create({ nom: nom.trim() });
        s = await this.siteStageRepository.save(s);
        siteMap.set(key, s);
      }
      return s;
    };

    const findOrCreateNature = async (nom: string): Promise<NatureStage> => {
      const key = nom.toLowerCase().trim();
      let n = natureMap.get(key);
      if (!n) {
        n = this.natureStageRepository.create({ nom: nom.trim() });
        n = await this.natureStageRepository.save(n);
        natureMap.set(key, n);
      }
      return n;
    };

    const parseDateRange = (text: string): { debut: Date; fin: Date } | null => {
      // Formats: "03 Nov au 29 Nov", "05 - 31 janv 2026", "06 oct au 30 oct"
      const mois: Record<string, number> = {
        janv: 1, janvier: 1, fev: 2, février: 2, mars: 3, avril: 4, mai: 5,
        juin: 6, juil: 7, juillet: 7, aout: 8, août: 8, sept: 9, septembre: 9,
        oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, décembre: 12,
      };
      // Normalize: remove extra spaces, replace au/-
      const clean = text.replace(/\s+/g, ' ').replace(/\s*au\s*/g, ' au ').replace(/\s*-\s*/g, ' au ').trim();
      const parts = clean.split(' au ');
      if (parts.length < 2) return null;

      const guessYear = (month: number): number => {
        const now = new Date();
        const currentYear = now.getFullYear();
        // Si le mois est passé par rapport au mois courant, l'année est probablement l'année prochaine
        return month < now.getMonth() + 1 ? currentYear + 1 : currentYear;
      };

      const parsePart = (s: string): { day: number; month: number; year?: number } | null => {
        const parts2 = s.trim().split(/\s+/);
        let day: number = 0, month: number = 0, year: number | undefined;
        for (const p of parts2) {
          const n = parseInt(p);
          if (!isNaN(n)) {
            if (n > 31) year = n;
            else if (day === 0) day = n;
          } else {
            for (const [k, v] of Object.entries(mois)) {
              if (p.toLowerCase().startsWith(k)) { month = v; break; }
            }
          }
        }
        if (day === 0 || month === 0) return null;
        return { day, month, year };
      };

      const debut = parsePart(parts[0]);
      const fin = parsePart(parts[1]);
      if (!debut || !fin) return null;
      const y1 = debut.year || guessYear(debut.month);
      const y2 = fin.year || guessYear(fin.month);
      return { debut: new Date(y1, debut.month - 1, debut.day), fin: new Date(y2, fin.month - 1, fin.day) };
    };

    for (const group of groups) {
      if (group.lieu.size === 0) continue;

      const getEtablissementId = (): number | undefined => {
        if (tenantId) return tenantId;
        const existing = studentMap.get(normalizeName(group.name));
        return existing?.etablissement?.id;
      };

      const rowEtablissementId = getEtablissementId();
      if (!rowEtablissementId) {
        erreurs.push(`${group.name}: impossible de déterminer l'établissement`);
        continue;
      }

      const etudiant = await findOrCreateStudent(group.name, rowEtablissementId, sheetName);
      if (!etudiant) {
        erreurs.push(`${group.name}: étudiant introuvable et création impossible (nom de feuille non conforme: "${sheetName}")`);
        continue;
      }

      for (const [stageIdx, lieuName] of group.lieu.entries()) {
        if (!lieuName) continue;

        const siteStage = await findOrCreateSite(lieuName);
        const service = group.service.get(stageIdx) || undefined;
        const natureName = group.nature.get(stageIdx);
        const dateText = group.date.get(stageIdx);

        // Créer une période par feuille + stage index
        const periodeLibelle = `${sheetName} - Stage ${stageIdx}`;
        let periode = periodeMap.get(periodeLibelle);
        if (!periode) {
          if (!anneeActive) {
            erreurs.push(`${group.name} stage ${stageIdx}: Aucune année active`);
            continue;
          }
          const dateRange = dateText ? parseDateRange(dateText) : null;
          periode = this.periodeStageRepository.create({
            libelle: periodeLibelle,
            dateDebut: dateRange?.debut || new Date(),
            dateFin: dateRange?.fin || new Date(),
            anneeUniversitaireId: anneeActive.id,
            etablissementId: rowEtablissementId,
          });
          periode = await this.periodeStageRepository.save(periode);
          periodeMap.set(periodeLibelle, periode);
        }

        const ak = affectationKey(etudiant.id, periode.id);
        const existing = existingAffectationMap.get(ak);
        if (existing) {
          const updateData: any = { siteStageId: siteStage.id, service, statut: StageStatus.ACTIF };
          if (natureName) {
            const nature = await findOrCreateNature(natureName);
            if (!siteNaturesMap.has(siteStage.id)) siteNaturesMap.set(siteStage.id, new Set());
            siteNaturesMap.get(siteStage.id)!.add(nature.id);
            updateData.natureStageId = nature.id;
          }
          affectationsToUpdate.push({ id: existing.id, ...updateData });
          continue;
        }

        const affectation = this.affectationRepository.create({
          etudiantId: etudiant.id,
          siteStageId: siteStage.id,
          periodeStageId: periode.id,
          service,
          statut: StageStatus.ACTIF,
          etablissementId: rowEtablissementId,
        });
        affectationsToCreate.push(affectation);
        existingAffectationMap.set(ak, affectation);

        // Lier la nature au site (Many-to-Many)
        if (natureName) {
          const nature = await findOrCreateNature(natureName);
          if (!siteNaturesMap.has(siteStage.id)) siteNaturesMap.set(siteStage.id, new Set());
          siteNaturesMap.get(siteStage.id)!.add(nature.id);
          affectation.natureStageId = nature.id;
        }
      }
    }

    // 5) Batch insert affectations
    const CHUNK = _batchSize;

    if (affectationsToCreate.length > 0) {
      for (let start = 0; start < affectationsToCreate.length; start += CHUNK) {
        const chunk = affectationsToCreate.slice(start, start + CHUNK);
        await this.affectationRepository.save(chunk);
      }
    }

    // 6) Batch update existing affectations
    if (affectationsToUpdate.length > 0) {
      for (let start = 0; start < affectationsToUpdate.length; start += CHUNK) {
        const chunk = affectationsToUpdate.slice(start, start + CHUNK);
        await Promise.all(chunk.map(u => this.affectationRepository.update(u.id, { siteStageId: u.siteStageId, service: u.service, statut: u.statut, natureStageId: u.natureStageId })));
      }
    }

    // 7) Mettre à jour la relation Many-to-Many SiteStage ↔ NatureStage
    for (const [siteId, natureIds] of siteNaturesMap.entries()) {
      const site = await this.siteStageRepository.findOne({
        where: { id: siteId },
        relations: { natures: true },
      });
      if (site) {
        const existingIds = new Set((site.natures || []).map(n => n.id));
        for (const nid of natureIds) {
          if (!existingIds.has(nid)) {
            const nature = await this.natureStageRepository.findOne({ where: { id: nid } });
            if (nature) site.natures.push(nature);
          }
        }
        await this.siteStageRepository.save(site);
      }
    }

    return { sheetName, affectationsCreated: affectationsToCreate.length + affectationsToUpdate.length, studentsCreated: studentsCreated.length, erreurs };
  }

  async getMyStageInfo(etudiantId: number) {
    const ecolagePaid = await this.financeService.hasPaidEcolage(etudiantId);

    const affectations = await this.affectationRepository.find({
      where: { etudiantId },
      relations: {
        siteStage: true,
        periodeStage: true,
        natureStage: true,
        enseignant: true,
      },
      order: { createdAt: 'DESC' },
    });

    return { ecolagePaid, affectations };
  }
}

