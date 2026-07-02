import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { SiteStage } from './entities/site-stage.entity';
import { PeriodeStage } from './entities/periode-stage.entity';
import { AffectationStage, StageStatus } from './entities/affectation-stage.entity';
import { CreateSiteStageDto } from './dto/create-site-stage.dto';
import { UpdateSiteStageDto } from './dto/update-site-stage.dto';
import { CreatePeriodeStageDto } from './dto/create-periode-stage.dto';
import { UpdatePeriodeStageDto } from './dto/update-periode-stage.dto';
import { CreateAffectationStageDto } from './dto/create-affectation-stage.dto';
import { UpdateAffectationStageDto } from './dto/update-affectation-stage.dto';
import { AffectationStageFilterDto } from './dto/affectation-stage-filter.dto';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

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
    @InjectRepository(Enseignant)
    private readonly enseignantRepository: Repository<Enseignant>,
    @InjectRepository(AnneeUniversitaire)
    private readonly anneeRepository: Repository<AnneeUniversitaire>,
  ) {}

  // ===================== SITES DE STAGE (Global) =====================

  async createSite(dto: CreateSiteStageDto): Promise<SiteStage> {
    const site = this.siteStageRepository.create(dto);
    return await this.siteStageRepository.save(site);
  }

  async findAllSites(search?: string): Promise<SiteStage[]> {
    if (search) {
      return await this.siteStageRepository.find({
        where: [
          { nom: ILike(`%${search}%`) },
          { ville: ILike(`%${search}%`) },
        ],
        order: { nom: 'ASC' },
      });
    }
    return await this.siteStageRepository.find({
      order: { nom: 'ASC' },
    });
  }

  async findOneSite(id: number): Promise<SiteStage> {
    const site = await this.siteStageRepository.findOne({ where: { id } });
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

    if (dto.siteStageId !== undefined) {
      const siteStage = await this.siteStageRepository.findOne({
        where: { id: dto.siteStageId },
      });
      if (!siteStage) {
        throw new NotFoundException('Site de stage non trouvé');
      }
      affectation.siteStageId = dto.siteStageId;
    }

    if (dto.enseignantId !== undefined) {
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
    }

    if (dto.statut !== undefined) {
      affectation.statut = dto.statut;
    }

    return await this.affectationRepository.save(affectation);
  }

  async removeAffectation(id: number, tenantId?: number): Promise<void> {
    const affectation = await this.findOneAffectation(id, tenantId);
    await this.affectationRepository.remove(affectation);
  }
}
