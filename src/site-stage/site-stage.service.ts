import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, In, IsNull, Repository } from 'typeorm';
import { SiteStage } from './entities/site-stage.entity';
import { LigneStage } from './entities/ligne-stage.entity';
import { LigneStageSlot, StageStatus } from './entities/ligne-stage-slot.entity';
import { NatureStage } from './entities/nature-stage.entity';
import { CreateSiteStageDto } from './dto/create-site-stage.dto';
import { UpdateSiteStageDto } from './dto/update-site-stage.dto';
import { CreateLigneStageDto } from './dto/create-ligne-stage.dto';
import { UpdateLigneStageDto } from './dto/update-ligne-stage.dto';
import { UpdateLigneSlotDto } from './dto/update-ligne-slot.dto';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { FinanceService } from '../finance/finance.service';

export type AutoAssignResult =
  | { success: true; ligne: LigneStage; reason?: undefined }
  | { success: false; ligne?: undefined; reason: string };

export interface AutoAssignAllReport {
  assigned: number;
  alreadyAssigned: number;
  skipped: {
    noCurriculum: number;
    stageDisabled: number;
    noActiveYear: number;
    failed: number;
  };
  failedReasons: { etudiantId: number; reason: string }[];
}

@Injectable()
export class SiteStageService {
  constructor(
    @InjectRepository(SiteStage)
    private readonly siteStageRepository: Repository<SiteStage>,
    @InjectRepository(LigneStage)
    private readonly ligneStageRepository: Repository<LigneStage>,
    @InjectRepository(LigneStageSlot)
    private readonly slotRepository: Repository<LigneStageSlot>,
    @InjectRepository(NatureStage)
    private readonly natureStageRepository: Repository<NatureStage>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Enseignant)
    private readonly enseignantRepository: Repository<Enseignant>,
    @InjectRepository(AnneeUniversitaire)
    private readonly anneeRepository: Repository<AnneeUniversitaire>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    private readonly financeService: FinanceService,
    private readonly dataSource: DataSource,
  ) {}

  // ===================== SITES DE STAGE (Global) =====================

  async createSite(dto: CreateSiteStageDto & { classeIds?: number[] }, natureNames?: string[]): Promise<SiteStage> {
    const site = this.siteStageRepository.create({
      nom: dto.nom,
      adresse: dto.adresse,
      telephone: dto.telephone,
      email: dto.email,
      responsable: dto.responsable,
      description: dto.description,
      capacite: dto.capacite,
    });
    if ((dto as any).classeIds?.length) {
      const classes = await this.classeRepository.find({ where: { id: In((dto as any).classeIds) } as any });
      (site as any).classes = classes;
    }
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

    return this.siteStageRepository.findOne({ where: { id: savedSite.id }, relations: { natures: true, classes: true } }) as Promise<SiteStage>;
  }

  async findOrCreateNature(nom: string, description?: string): Promise<NatureStage> {
    const existing = await this.natureStageRepository.findOne({ where: { nom } });
    if (existing) return existing;
    const nature = this.natureStageRepository.create({ nom, description });
    return await this.natureStageRepository.save(nature);
  }

  async findAllSites(search?: string, natureStageId?: number, capaciteMin?: number): Promise<SiteStage[]> {
    const findOptions: any = {
      relations: { natures: true, classes: true } as any,
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
      relations: { natures: true, classes: true } as any,
    });
    if (!site) {
      throw new NotFoundException(`Le site de stage #${id} n'a pas été trouvé`);
    }
    return site;
  }

  async updateSite(id: number, dto: UpdateSiteStageDto & { classeIds?: number[] }): Promise<SiteStage> {
    const site = await this.findOneSite(id);
    const { classeIds, ...rest } = dto as any;
    Object.assign(site, rest);
    if (classeIds !== undefined) {
      if (classeIds.length === 0) (site as any).classes = [];
      else (site as any).classes = await this.classeRepository.find({ where: { id: In(classeIds) } as any });
    }
    return await this.siteStageRepository.save(site);
  }

  async removeSite(id: number): Promise<void> {
    const site = await this.findOneSite(id);
    await this.siteStageRepository.remove(site);
  }

  // ===================== NATURES DE STAGE =====================

  async createNatureStage(dto: { nom: string; description?: string; classeIds?: number[]; niveauIds?: number[] }): Promise<NatureStage> {
    const existing = await this.natureStageRepository.findOne({ where: { nom: dto.nom }, relations: { classes: true, niveaux: true } as any });
    if (existing) return existing;
    const nature: any = this.natureStageRepository.create({ nom: dto.nom, description: dto.description } as any);
    if ((dto as any).classeIds?.length) {
      nature.classes = await this.classeRepository.find({ where: { id: In((dto as any).classeIds) } as any });
    }
    if ((dto as any).niveauIds?.length) {
      nature.niveaux = await this.niveauRepository.find({ where: { id: In((dto as any).niveauIds) } as any });
    }
    return await this.natureStageRepository.save(nature);
  }

  async findAllNaturesStage(): Promise<NatureStage[]> {
    return await this.natureStageRepository.find({ relations: { classes: true, niveaux: true } as any, order: { nom: 'ASC' } as any });
  }

  async findOneNatureStage(id: number): Promise<NatureStage> {
    const nature = await this.natureStageRepository.findOne({ where: { id }, relations: { classes: true, niveaux: true } as any });
    if (!nature) {
      throw new NotFoundException(`La nature de stage #${id} n'a pas été trouvée`);
    }
    return nature;
  }

  async updateNatureStage(id: number, dto: { nom?: string; description?: string; classeIds?: number[]; niveauIds?: number[] }): Promise<NatureStage> {
    const nature = await this.findOneNatureStage(id);
    if (dto.nom !== undefined) nature.nom = dto.nom;
    if (dto.description !== undefined) nature.description = dto.description;
    if ((dto as any).classeIds !== undefined) {
      const ids = (dto as any).classeIds;
      (nature as any).classes = ids.length === 0 ? [] : await this.classeRepository.find({ where: { id: In(ids) } as any });
    }
    if ((dto as any).niveauIds !== undefined) {
      const ids = (dto as any).niveauIds;
      (nature as any).niveaux = ids.length === 0 ? [] : await this.niveauRepository.find({ where: { id: In(ids) } as any });
    }
    return await this.natureStageRepository.save(nature);
  }

  async removeNatureStage(id: number): Promise<void> {
    const nature = await this.findOneNatureStage(id);
    await this.natureStageRepository.remove(nature);
  }

  // ===================== LIGNES DE STAGE =====================

  private readonly ligneRelations = {
    etudiant: true,
    classe: true,
    niveau: true,
    slots: { siteStage: true, natureStage: true, enseignant: true },
  } as const;

  private sortSlots(ligne: LigneStage) {
    ligne.slots?.sort((a, b) => a.ordre - b.ordre);
    return ligne;
  }

  async createLigne(dto: CreateLigneStageDto, tenantId?: number): Promise<LigneStage> {
    const classe = await this.classeRepository.findOne({ where: { id: dto.classeId } });
    if (!classe) throw new NotFoundException('Parcours non trouvé');

    const niveau = await this.niveauRepository.findOne({ where: { id: dto.niveauId } });
    if (!niveau) throw new NotFoundException('Niveau non trouvé');

    const annee = await this.anneeRepository.findOne({ where: { id: dto.anneeUniversitaireId } });
    if (!annee) throw new NotFoundException('Année universitaire non trouvée');

    const etablissementId = tenantId || annee.etablissementId;
    if (!etablissementId) throw new NotFoundException('Établissement non trouvé');

    if (dto.etudiantId) {
      const etudiant = await this.etudiantRepository.findOne({ where: { id: dto.etudiantId } });
      if (!etudiant) throw new NotFoundException('Étudiant non trouvé');
    }

    const ligne = this.ligneStageRepository.create({
      classeId: dto.classeId,
      niveauId: dto.niveauId,
      anneeUniversitaireId: dto.anneeUniversitaireId,
      etudiantId: dto.etudiantId,
      etablissementId,
      slots: (dto.slots || []).map((s) =>
        this.slotRepository.create({
          ordre: s.ordre,
          libelle: s.libelle,
          dateDebut: s.dateDebut ? new Date(s.dateDebut) : null,
          dateFin: s.dateFin ? new Date(s.dateFin) : null,
          siteStageId: s.siteStageId,
          natureStageId: s.natureStageId,
          service: s.service,
          enseignantId: s.enseignantId,
          statut: s.statut ?? StageStatus.EN_ATTENTE,
        }),
      ),
    });

    const saved = await this.ligneStageRepository.save(ligne);
    return this.findOneLigne(saved.id, tenantId);
  }

  async findOneLigne(id: number, tenantId?: number): Promise<LigneStage> {
    const where: any = { id };
    if (tenantId) where.etablissementId = tenantId;
    const ligne = await this.ligneStageRepository.findOne({
      where,
      relations: this.ligneRelations,
    });
    if (!ligne) {
      throw new NotFoundException(`La ligne de stage #${id} n'a pas été trouvée`);
    }
    return this.sortSlots(ligne);
  }

  async findLignesByEtudiant(etudiantId: number, tenantId?: number): Promise<LigneStage[]> {
    const where: any = { etudiantId };
    if (tenantId) where.etablissementId = tenantId;
    const lignes = await this.ligneStageRepository.find({
      where,
      relations: this.ligneRelations,
      order: { anneeUniversitaireId: 'DESC' },
    });
    lignes.forEach((l) => this.sortSlots(l));
    return lignes;
  }

  async updateLigneEtudiant(
    id: number,
    dto: UpdateLigneStageDto,
    tenantId?: number,
  ): Promise<LigneStage> {
    // Transaction + verrou pessimiste pour éviter double affectation concurrente
    // et contourner le piège TypeORM où save() re-dérive la FK depuis la relation.
    return this.dataSource.transaction(async (manager) => {
      const ligneRepo = manager.getRepository(LigneStage);
      const etudiantRepo = manager.getRepository(Etudiant);

      const where: any = { id };
      if (tenantId) where.etablissementId = tenantId;

      // FOR UPDATE ne peut pas verrouiller le côté NULL d'un outer join (slots) -> verrou d'abord sans relations
      const locked = await ligneRepo.findOne({
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        throw new NotFoundException(`La ligne de stage #${id} n'a pas été trouvée`);
      }
      const ligne = await ligneRepo.findOne({
        where,
        relations: this.ligneRelations,
      });
      if (!ligne) {
        throw new NotFoundException(`La ligne de stage #${id} n'a pas été trouvée`);
      }

      if (dto.etudiantId) {
        const etudiant = await etudiantRepo.findOne({ where: { id: dto.etudiantId } });
        if (!etudiant) throw new NotFoundException('Étudiant non trouvé');

        const conflict = await ligneRepo.findOne({
          where: {
            etudiantId: dto.etudiantId,
            anneeUniversitaireId: ligne.anneeUniversitaireId,
            classeId: ligne.classeId,
            niveauId: ligne.niveauId,
          },
        });
        if (conflict && conflict.id !== ligne.id) {
          throw new BadRequestException(
            'Cet étudiant est déjà assigné à une autre ligne pour ce parcours/niveau/année',
          );
        }
        // update() évite la re-dérivation FK de la relation
        await ligneRepo.update({ id: ligne.id }, { etudiantId: dto.etudiantId });
      } else {
        await ligneRepo.update({ id: ligne.id }, { etudiantId: null as any });
      }

      const fresh = await ligneRepo.findOne({
        where,
        relations: this.ligneRelations,
      });
      if (!fresh) throw new NotFoundException(`La ligne de stage #${id} n'a pas été trouvée`);
      return this.sortSlots(fresh);
    });
  }

  async removeLigne(id: number, tenantId?: number): Promise<void> {
    const ligne = await this.findOneLigne(id, tenantId);
    await this.ligneStageRepository.remove(ligne);
  }

  async createModeleVide(
    anneeUniversitaireId: number,
    tenantId?: number,
    inputSlots?: { ordre: number; dateDebut?: string | null; dateFin?: string | null }[],
  ): Promise<LigneStage> {
    const annee = await this.anneeRepository.findOne({ where: { id: anneeUniversitaireId } });
    if (!annee) throw new NotFoundException('Année universitaire non trouvée');
    const etablissementId = tenantId || annee.etablissementId;
    if (!etablissementId) throw new NotFoundException('Établissement non trouvé');

    const existing = await this.ligneStageRepository.findOne({
      where: { anneeUniversitaireId, etablissementId } as any,
    });
    if (existing) {
      throw new BadRequestException(
        'Un modèle existe déjà pour cette année — videz d’abord les affectations ou créez une nouvelle ligne manuellement',
      );
    }

    let classeId: number | null = null;
    let niveauId: number | null = null;
    const firstClasse = await this.classeRepository.findOne({ where: {}, order: { id: 'ASC' } as any });
    if (firstClasse) {
      classeId = firstClasse.id;
      const firstNiveau = await this.niveauRepository.findOne({
        where: { classe: { id: firstClasse.id } } as any,
        order: { id: 'ASC' } as any,
      });
      if (firstNiveau) niveauId = firstNiveau.id;
      else {
        const anyNiveau = await this.niveauRepository.findOne({ where: {}, order: { id: 'ASC' } as any });
        if (anyNiveau) niveauId = anyNiveau.id;
      }
    }
    if (!classeId || !niveauId) {
      throw new BadRequestException('Aucun parcours/niveau trouvé — créez d’abord un parcours et un niveau');
    }

    let slots: Partial<LigneStageSlot>[] = [];
    if (inputSlots && inputSlots.length > 0) {
      // Saisie manuelle : on garde uniquement les dates, les 5 périodes sont vides (site/nature/service/tuteur null)
      slots = inputSlots
        .slice(0, 5)
        .sort((a, b) => a.ordre - b.ordre)
        .map((s) => ({
          ordre: s.ordre,
          libelle: `Stage ${s.ordre}`,
          dateDebut: s.dateDebut ? new Date(s.dateDebut) : null,
          dateFin: s.dateFin ? new Date(s.dateFin) : null,
          siteStageId: null as any,
          natureStageId: null as any,
          service: null as any,
          enseignantId: null as any,
          statut: StageStatus.EN_ATTENTE,
        } as any));
      // compléter à 5 si moins de 5 fournis
      while (slots.length < 5) {
        const ordre = slots.length + 1;
        slots.push({
          ordre,
          libelle: `Stage ${ordre}`,
          dateDebut: null,
          dateFin: null,
          siteStageId: null as any,
          natureStageId: null as any,
          service: null as any,
          enseignantId: null as any,
          statut: StageStatus.EN_ATTENTE,
        } as any);
      }
    } else {
      let start: Date | null = annee.startDate ? new Date(annee.startDate) : null;
      let end: Date | null = annee.endDate ? new Date(annee.endDate) : null;

      for (let i = 0; i < 5; i++) {
        let dateDebut: Date | null = null;
        let dateFin: Date | null = null;
        if (start && end && end.getTime() > start.getTime()) {
          const total = end.getTime() - start.getTime();
          const slotMs = total / 5;
          dateDebut = new Date(start.getTime() + i * slotMs);
          dateFin = new Date(start.getTime() + (i + 1) * slotMs - 2 * 24 * 60 * 60 * 1000);
          if (dateFin.getTime() > end.getTime()) dateFin = new Date(end);
        }
        slots.push({
          ordre: i + 1,
          libelle: `Stage ${i + 1}`,
          dateDebut,
          dateFin,
          siteStageId: null as any,
          natureStageId: null as any,
          service: null as any,
          enseignantId: null as any,
          statut: StageStatus.EN_ATTENTE,
        } as any);
      }
    }

    const ligne = this.ligneStageRepository.create({
      classeId,
      niveauId,
      anneeUniversitaireId,
      etablissementId,
      etudiantId: null as any,
      nomIndicatif: 'Modèle vide — 5 périodes',
      slots: slots.map((s) => this.slotRepository.create(s as any)),
    } as any);

    const saved = await this.ligneStageRepository.save(ligne as any);
    return this.findOneLigne(saved.id, tenantId);
  }

  async purgeAffectations(tenantId?: number, anneeUniversitaireId?: number): Promise<{ deleted: number }> {
    const where: any = {};
    if (tenantId) where.etablissementId = tenantId;
    if (anneeUniversitaireId) where.anneeUniversitaireId = anneeUniversitaireId;
    const lignes = await this.ligneStageRepository.find({ where, select: { id: true } as any });
    if (lignes.length === 0) return { deleted: 0 };
    const ids = lignes.map((l) => l.id);
    // slots d'abord (FK)
    await this.slotRepository.delete({ ligneStageId: In(ids) } as any);
    const result = await this.ligneStageRepository.delete({ id: In(ids) } as any);
    return { deleted: (result as any).affected ?? ids.length };
  }

  async updateSlot(
    ligneId: number,
    ordre: number,
    dto: UpdateLigneSlotDto,
    tenantId?: number,
  ): Promise<LigneStage> {
    const ligne = await this.findOneLigne(ligneId, tenantId);
    let slot = ligne.slots?.find((s) => s.ordre === ordre);

    if (dto.siteStageId) {
      const site = await this.siteStageRepository.findOne({ where: { id: dto.siteStageId } });
      if (!site) throw new NotFoundException('Site de stage non trouvé');
    }
    if (dto.natureStageId) {
      const nature = await this.natureStageRepository.findOne({ where: { id: dto.natureStageId } });
      if (!nature) throw new NotFoundException('Nature de stage non trouvée');
    }
    if (dto.enseignantId) {
      const enseignant = await this.enseignantRepository.findOne({ where: { id: dto.enseignantId } });
      if (!enseignant) throw new NotFoundException('Enseignant non trouvé');
    }

    if (!slot) {
      slot = this.slotRepository.create({
        ligneStageId: ligneId,
        ordre,
        libelle: dto.libelle || `Stage ${ordre}`,
      });
    }

    if (dto.libelle !== undefined) slot!.libelle = dto.libelle;
    if (dto.dateDebut !== undefined) slot!.dateDebut = dto.dateDebut ? new Date(dto.dateDebut) : null;
    if (dto.dateFin !== undefined) slot!.dateFin = dto.dateFin ? new Date(dto.dateFin) : null;
    if (dto.siteStageId !== undefined) slot!.siteStageId = dto.siteStageId;
    if (dto.natureStageId !== undefined) slot!.natureStageId = dto.natureStageId;
    if (dto.service !== undefined) slot!.service = dto.service;
    if (dto.enseignantId !== undefined) slot!.enseignantId = dto.enseignantId;
    if (dto.statut !== undefined) slot!.statut = dto.statut;

    await this.slotRepository.save(slot!);
    return this.findOneLigne(ligneId, tenantId);
  }

  async bulkUpdateSlot(
    ligneId: number,
    ordre: number,
    dto: UpdateLigneSlotDto,
    tenantId?: number,
  ): Promise<{ updated: number }> {
    const refLigne = await this.findOneLigne(ligneId, tenantId);

    if (dto.siteStageId) {
      const site = await this.siteStageRepository.findOne({ where: { id: dto.siteStageId } });
      if (!site) throw new NotFoundException('Site de stage non trouvé');
    }
    if (dto.natureStageId) {
      const nature = await this.natureStageRepository.findOne({ where: { id: dto.natureStageId } });
      if (!nature) throw new NotFoundException('Nature de stage non trouvée');
    }
    if (dto.enseignantId) {
      const enseignant = await this.enseignantRepository.findOne({ where: { id: dto.enseignantId } });
      if (!enseignant) throw new NotFoundException('Enseignant non trouvé');
    }

    // Période globale : propage à toute l'année, même pour tous parcours/niveaux
    const scope: any = {
      anneeUniversitaireId: refLigne.anneeUniversitaireId,
      etablissementId: refLigne.etablissementId,
    };

    return this.dataSource.transaction(async (manager) => {
      const slotRepo = manager.getRepository(LigneStageSlot);
      const ligneRepo = manager.getRepository(LigneStage);
      const lignes = await ligneRepo.find({ where: scope, relations: { slots: true } });

      let updated = 0;
      for (const l of lignes) {
        let slot = l.slots?.find((s) => s.ordre === ordre);
        if (!slot) {
          slot = slotRepo.create({
            ligneStageId: l.id,
            ordre,
            libelle: dto.libelle || `Stage ${ordre}`,
          });
        }
        if (dto.libelle !== undefined) slot.libelle = dto.libelle;
        if (dto.dateDebut !== undefined) slot.dateDebut = dto.dateDebut ? new Date(dto.dateDebut as any) : null;
        if (dto.dateFin !== undefined) slot.dateFin = dto.dateFin ? new Date(dto.dateFin as any) : null;
        if (dto.siteStageId !== undefined) (slot as any).siteStageId = dto.siteStageId;
        if (dto.natureStageId !== undefined) (slot as any).natureStageId = dto.natureStageId;
        if (dto.service !== undefined) (slot as any).service = dto.service;
        if (dto.enseignantId !== undefined) (slot as any).enseignantId = dto.enseignantId;
        if (dto.statut !== undefined) (slot as any).statut = dto.statut;
        await slotRepo.save(slot);
        updated++;
      }
      return { updated };
    });
  }

  async bulkUpdateGlobalStatut(
    anneeUniversitaireId: number,
    statut: StageStatus,
    tenantId?: number,
    ordre?: number,
  ): Promise<{ updated: number }> {
    if (!Object.values(StageStatus).includes(statut as any)) {
      throw new BadRequestException(`Statut invalide: ${statut}`);
    }
    // UPDATE via sous-requête pour éviter le JOIN invalide en Postgres (QueryFailedError: missing FROM clause for table « ligne »)
    const subQb = this.ligneStageRepository
      .createQueryBuilder('ligne')
      .select('ligne.id')
      .where('ligne.anneeUniversitaireId = :anneeUniversitaireId', { anneeUniversitaireId });
    if (tenantId) subQb.andWhere('ligne.etablissementId = :tenantId', { tenantId });

    const qb = this.dataSource
      .createQueryBuilder()
      .update(LigneStageSlot)
      .set({ statut } as any)
      .where(`"ligneStageId" IN (${subQb.getQuery()})`)
      .setParameters(subQb.getParameters());
    if (ordre) qb.andWhere(`"ordre" = :ordre`, { ordre });
    const result = await qb.execute();
    return { updated: (result as any).affected ?? 0 };
  }

  async getGrille(
    anneeUniversitaireId: number,
    search?: string,
    page = 1,
    limit = 2,
    tenantId?: number,
    classeIds?: number[],
    niveauId?: number,
    siteStageId?: number,
    natureStageId?: number,
    all = false,
  ): Promise<{ items: LigneStage[]; total: number; page: number; limit: number }> {
    const qb = this.ligneStageRepository
      .createQueryBuilder('ligne')
      .leftJoinAndSelect('ligne.etudiant', 'etudiant')
      .leftJoinAndSelect('ligne.classe', 'classe')
      .leftJoinAndSelect('ligne.niveau', 'niveau')
      .leftJoinAndSelect('ligne.slots', 'slot')
      .leftJoinAndSelect('slot.siteStage', 'siteStage')
      .leftJoinAndSelect('slot.natureStage', 'natureStage')
      .leftJoinAndSelect('slot.enseignant', 'enseignant')
      .where('ligne.anneeUniversitaireId = :anneeUniversitaireId', { anneeUniversitaireId });

    if (tenantId) qb.andWhere('ligne.etablissementId = :tenantId', { tenantId });
    if (classeIds && classeIds.length > 0) qb.andWhere('ligne.classeId IN (:...classeIds)', { classeIds });
    if (niveauId) qb.andWhere('ligne.niveauId = :niveauId', { niveauId });

    if (siteStageId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM ligne_stage_slot s WHERE s."ligneStageId" = ligne.id AND s."siteStageId" = :siteStageId)`,
        { siteStageId },
      );
    }
    if (natureStageId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM ligne_stage_slot s2 WHERE s2."ligneStageId" = ligne.id AND s2."natureStageId" = :natureStageId)`,
        { natureStageId },
      );
    }
    if (search) {
      const q = `%${search}%`;
      qb.andWhere(
        `(etudiant.firstName ILIKE :q OR etudiant.lastName ILIKE :q OR etudiant.matricule ILIKE :q OR ligne.nomIndicatif ILIKE :q)`,
        { q },
      );
    }

    qb.orderBy('ligne.id', 'ASC').addOrderBy('slot.ordre', 'ASC');

    // Count sans jointure slots pour éviter le gonflement du COUNT (1 ligne = 5 slots)
    const countQb = this.ligneStageRepository
      .createQueryBuilder('ligne')
      .leftJoin('ligne.etudiant', 'etudiant')
      .where('ligne.anneeUniversitaireId = :anneeUniversitaireId', { anneeUniversitaireId });
    if (tenantId) countQb.andWhere('ligne.etablissementId = :tenantId', { tenantId });
    if (classeIds && classeIds.length > 0) countQb.andWhere('ligne.classeId IN (:...classeIds)', { classeIds });
    if (niveauId) countQb.andWhere('ligne.niveauId = :niveauId', { niveauId });
    if (siteStageId) countQb.andWhere(`EXISTS (SELECT 1 FROM ligne_stage_slot s WHERE s."ligneStageId" = ligne.id AND s."siteStageId" = :siteStageId)`, { siteStageId });
    if (natureStageId) countQb.andWhere(`EXISTS (SELECT 1 FROM ligne_stage_slot s2 WHERE s2."ligneStageId" = ligne.id AND s2."natureStageId" = :natureStageId)`, { natureStageId });
    if (search) {
      const q = `%${search}%`;
      countQb.andWhere(`(etudiant.firstName ILIKE :q OR etudiant.lastName ILIKE :q OR etudiant.matricule ILIKE :q OR ligne.nomIndicatif ILIKE :q)`, { q });
    }
    const total = await countQb.getCount();

    if (all) {
      const items = await qb.getMany();
      items.forEach((l) => this.sortSlots(l));
      return { items, total, page: 1, limit: total };
    }
    // Pagination correcte : on pagine sur les IDs distincts, pas sur les lignes jointées (sinon LIMIT 5 sur 5 slots = 1 ligne)
    const skip = (page - 1) * limit;
    const idsQb = this.ligneStageRepository
      .createQueryBuilder('ligne')
      .select('ligne.id')
      .leftJoin('ligne.etudiant', 'etudiant')
      .where('ligne.anneeUniversitaireId = :anneeUniversitaireId', { anneeUniversitaireId });
    if (tenantId) idsQb.andWhere('ligne.etablissementId = :tenantId', { tenantId });
    if (classeIds && classeIds.length > 0) idsQb.andWhere('ligne.classeId IN (:...classeIds)', { classeIds });
    if (niveauId) idsQb.andWhere('ligne.niveauId = :niveauId', { niveauId });
    if (siteStageId) idsQb.andWhere(`EXISTS (SELECT 1 FROM ligne_stage_slot s WHERE s."ligneStageId" = ligne.id AND s."siteStageId" = :siteStageId)`, { siteStageId });
    if (natureStageId) idsQb.andWhere(`EXISTS (SELECT 1 FROM ligne_stage_slot s2 WHERE s2."ligneStageId" = ligne.id AND s2."natureStageId" = :natureStageId)`, { natureStageId });
    if (search) {
      const q = `%${search}%`;
      idsQb.andWhere(`(etudiant.firstName ILIKE :q OR etudiant.lastName ILIKE :q OR etudiant.matricule ILIKE :q OR ligne.nomIndicatif ILIKE :q)`, { q });
    }
    idsQb.orderBy('ligne.id', 'ASC').skip(skip).take(limit);
    const idRows = await idsQb.getMany();
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) return { items: [], total, page, limit };
    // Requête complète uniquement sur les IDs paginés
    const itemsQb = this.ligneStageRepository
      .createQueryBuilder('ligne')
      .leftJoinAndSelect('ligne.etudiant', 'etudiant')
      .leftJoinAndSelect('ligne.classe', 'classe')
      .leftJoinAndSelect('ligne.niveau', 'niveau')
      .leftJoinAndSelect('ligne.slots', 'slot')
      .leftJoinAndSelect('slot.siteStage', 'siteStage')
      .leftJoinAndSelect('slot.natureStage', 'natureStage')
      .leftJoinAndSelect('slot.enseignant', 'enseignant')
      .where('ligne.id IN (:...ids)', { ids })
      .orderBy('ligne.id', 'ASC')
      .addOrderBy('slot.ordre', 'ASC');
    const items = await itemsQb.getMany();
    items.forEach((l) => this.sortSlots(l));
    return { items, total, page, limit };
  }

  // ===================== AUTO-ASSIGNATION =====================

  /**
   * Assigne l'étudiant à une ligne vacante du même parcours / niveau / année
   * active / établissement. S'il n'existe pas encore de ligne vacante (cas
   * typique ESPA, non seedé comme ESPM), une ligne est créée : le circuit
   * (créneaux) est cloné depuis une ligne existante du même trio, sinon une
   * ligne avec un créneau par défaut. `siteStageId` ne sert qu'à préférer
   * une ligne dont un créneau utilise déjà ce site.
   *
   * Retourne un objet structuré { success, ligne?, reason? } pour que le
   * caller puisse afficher un message clair au lieu d'échouer silencieusement.
   */
  async autoAssignStage(
    etudiantId: number,
    classeId: number,
    niveauId: number,
    etablissementId: number,
    siteStageId?: number,
    _overwrite = false,
  ): Promise<AutoAssignResult> {
    if (!etudiantId || !classeId || !niveauId || !etablissementId) {
      return { success: false, reason: 'Données incomplètes pour l\'assignation (étudiant, parcours ou niveau manquant)' };
    }

    // Vérifications hors transaction (lecture seule, pas de lock nécessaire)
    const etablissement = await this.etablissementRepository?.findOne?.({
      where: { id: etablissementId },
    });
    if (etablissement && etablissement.stageEnabled === false) {
      return { success: false, reason: 'Le module de stage est désactivé pour cet établissement' };
    }

    const anneeActive = await this.anneeRepository.findOne({
      where: { etablissementId, isActive: true },
    });
    if (!anneeActive) {
      return {
        success: false,
        reason: 'Aucune année universitaire active pour cet établissement — activez d\'abord une année dans le module Scolaire',
      };
    }

    const etudiantExists = await this.etudiantRepository.findOne({ where: { id: etudiantId } });
    if (!etudiantExists) {
      return { success: false, reason: 'Étudiant introuvable dans la base' };
    }

    // Section critique : verrou pessimiste + transaction pour éviter double affectation
    try {
      return await this.dataSource.transaction(async (manager) => {
        const ligneRepo = manager.getRepository(LigneStage);

        const existing = await ligneRepo.findOne({
          where: {
            etudiantId,
            anneeUniversitaireId: anneeActive.id,
            etablissementId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (existing) {
          const ligne = await ligneRepo.findOne({
            where: { id: existing.id },
            relations: this.ligneRelations,
          });
          if (!ligne) throw new NotFoundException(`La ligne de stage #${existing.id} n'a pas été trouvée`);
          return { success: true, ligne: this.sortSlots(ligne) } as AutoAssignResult;
        }

        const ligne = await this.findOrCreateVacantLigneTx(
          manager,
          classeId,
          niveauId,
          anneeActive.id,
          etablissementId,
          siteStageId,
        );

        // update() pour éviter la re-dérivation FK de la relation (même piège que updateLigneEtudiant)
        await ligneRepo.update({ id: ligne.id }, { etudiantId });

        const saved = await ligneRepo.findOne({
          where: { id: ligne.id },
          relations: this.ligneRelations,
        });
        if (!saved) throw new NotFoundException(`La ligne de stage #${ligne.id} n'a pas été trouvée`);
        return { success: true, ligne: this.sortSlots(saved) } as AutoAssignResult;
      });
    } catch (e) {
      if (e instanceof NotFoundException && e.message.includes('Aucune période')) {
        return { success: false, reason: e.message };
      }
      throw e;
    }
  }

  /**
   * Ligne vacante du tenant, ou nouvelle ligne calquée sur le circuit
   * existant (même parcours / niveau / année / établissement).
   * Méthode hors transaction utilisée par le seed ; en requête HTTP on passe par Tx.
   */
  private async findOrCreateVacantLigne(
    classeId: number,
    niveauId: number,
    anneeUniversitaireId: number,
    etablissementId: number,
    siteStageId?: number,
  ): Promise<LigneStage> {
    // Période globale : même pour tous les parcours/niveaux, scope = année + établissement uniquement
    const scopeCreate = {
      classeId,
      niveauId,
      anneeUniversitaireId,
      etablissementId,
    };
    const scopeSearch = {
      anneeUniversitaireId,
      etablissementId,
    };

    const candidates = await this.ligneStageRepository.find({
      where: { ...scopeSearch, etudiantId: IsNull() } as any,
      relations: { slots: true },
      order: { id: 'ASC' },
    });

    if (candidates.length > 0) {
      const preferred = siteStageId
        ? candidates.find((l) => l.slots?.some((s) => s.siteStageId === siteStageId))
        : undefined;
      const picked = preferred || candidates[0];
      // réaligner la ligne vacante sur le parcours/niveau de l'étudiant (période globale)
      let needsSave = false;
      if (picked.classeId !== classeId || picked.niveauId !== niveauId) {
        picked.classeId = classeId;
        picked.niveauId = niveauId;
        needsSave = true;
      }
      // si la ligne modèle n'a que les dates (service/lieu/nature/tuteur vides), la compléter aléatoirement en filtrant par parcours et niveau
      const hasEmpty = picked.slots?.some((s) => !s.siteStageId || !s.natureStageId || !s.service || !(s as any).enseignantId);
      if (hasEmpty) {
        const enriched = await this.enrichSlotsWithRandom(this.dataSource.manager, picked.slots, anneeUniversitaireId, siteStageId, classeId, niveauId);
        for (let i = 0; i < picked.slots.length; i++) {
          Object.assign(picked.slots[i], enriched[i]);
          await this.slotRepository.save(picked.slots[i]);
        }
      }
      if (needsSave) await this.ligneStageRepository.save(picked);
      return picked;
    }

    const template = await this.ligneStageRepository.findOne({
      where: scopeSearch as any,
      relations: { slots: true },
      order: { id: 'ASC' },
    });

    const hasRealTemplate =
      !!template?.slots?.length &&
      template.slots.some((s) => s.siteStageId != null || s.natureStageId != null || s.dateDebut != null);

    if (!hasRealTemplate) {
      throw new NotFoundException(
        `Aucune période de stage créée par l'admin pour cette année — créez d'abord une période modèle via "Nouvelle ligne" (Service/Date/Lieu/Nature, même pour tous)`,
      );
    }

    const sorted = [...template!.slots].sort((a, b) => a.ordre - b.ordre);
    let slotSources: Partial<LigneStageSlot>[] = sorted.length >= 5 ? sorted.slice(0, 5) : sorted;
    // Si le modèle n'a que les dates (service/lieu/nature/tuteur vides), compléter aléatoirement en filtrant par parcours et niveau
    if (slotSources.some((s) => !s.siteStageId || !s.natureStageId || !s.service || !(s as any).enseignantId)) {
      slotSources = await this.enrichSlotsWithRandom(this.dataSource.manager, slotSources as LigneStageSlot[], anneeUniversitaireId, siteStageId, classeId, niveauId);
    }

    const ligne = this.ligneStageRepository.create({
      ...scopeCreate,
      etudiantId: null,
      slots: slotSources.map((s) =>
        this.slotRepository.create({
          ordre: s.ordre!,
          libelle: s.libelle || `Stage ${s.ordre}`,
          dateDebut: s.dateDebut ?? null,
          dateFin: s.dateFin ?? null,
          siteStageId: s.siteStageId ?? null,
          natureStageId: s.natureStageId ?? null,
          service: s.service,
          enseignantId: (s as any).enseignantId ?? null,
          statut: StageStatus.EN_ATTENTE,
        }),
      ),
    });

    return this.ligneStageRepository.save(ligne);
  }

  // buildRandomSlots : génère 5 créneaux aléatoires complets (utilisé pour enrichir un modèle dates-seules) + tuteurs aléatoires
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private async buildRandomSlots(
    manager: EntityManager,
    anneeUniversitaireId: number,
    preferredSiteStageId?: number,
    classeId?: number,
    niveauId?: number,
  ): Promise<Partial<LigneStageSlot>[]> {
    const siteRepo = manager.getRepository(SiteStage);
    const natureRepo = manager.getRepository(NatureStage);
    const anneeRepo = manager.getRepository(AnneeUniversitaire);
    const enseignantRepo = manager.getRepository(Enseignant);

    const [allSites, allNatures, annee, enseignants] = await Promise.all([
      siteRepo.find({ relations: { classes: true } } as any),
      natureRepo.find({ relations: { classes: true, niveaux: true } } as any),
      anneeRepo.findOne({ where: { id: anneeUniversitaireId } }),
      enseignantRepo.find({ select: { id: true } as any, take: 100 } as any),
    ]);
    // Filtrer sites/natures par parcours et niveau si définis (sinon ouvert à tous) — la nature varie selon parcours et niveau
    let sites = allSites as any[];
    let natures = allNatures as any[];
    if (classeId || niveauId) {
      const filteredSites = (allSites as any[]).filter((s) => !s.classes || s.classes.length === 0 || (classeId && s.classes.some((c: any) => c.id === classeId)));
      if (filteredSites.length >= 3) sites = filteredSites;
      const isNatureCompatible = (n: any) => {
        const classeOk = !n.classes || n.classes.length === 0 || !classeId || n.classes.some((c: any) => c.id === classeId);
        const niveauOk = !n.niveaux || n.niveaux.length === 0 || !niveauId || n.niveaux.some((nv: any) => nv.id === niveauId);
        return classeOk && niveauOk;
      };
      const filteredNatures = (allNatures as any[]).filter(isNatureCompatible);
      if (filteredNatures.length >= 2) natures = filteredNatures;
      else if (filteredNatures.length > 0) natures = filteredNatures;
    }

    // Période de stage = découpage de l'année universitaire en 5 stages séquentiels
    let start: Date | null = null;
    let end: Date | null = null;
    if (annee?.startDate && annee?.endDate) {
      start = new Date(annee.startDate);
      end = new Date(annee.endDate);
    }

    const pickedSites = sites.length >= 5 ? this.shuffle(sites).slice(0, 5) : this.shuffle([...sites, ...sites, ...sites]).slice(0, 5);
    const pickedNatures = natures.length >= 5 ? this.shuffle(natures).slice(0, 5) : this.shuffle([...natures, ...natures]).slice(0, 5);
    const pickedEnseignants = enseignants.length > 0 ? this.shuffle(enseignants).slice(0, 5) : [];

    // garantir que le site préféré (passé par l'inscription) apparaisse dans un des 5 stages
    if (preferredSiteStageId && !pickedSites.some((s) => s.id === preferredSiteStageId) && sites.some((s) => s.id === preferredSiteStageId)) {
      pickedSites[0] = { id: preferredSiteStageId } as any;
    }

    const slots: Partial<LigneStageSlot>[] = [];
    for (let i = 0; i < 5; i++) {
      let dateDebut: Date | null = null;
      let dateFin: Date | null = null;
      if (start && end && end.getTime() > start.getTime()) {
        const total = end.getTime() - start.getTime();
        const slotMs = total / 5;
        dateDebut = new Date(start.getTime() + i * slotMs);
        dateFin = new Date(start.getTime() + (i + 1) * slotMs - 2 * 24 * 60 * 60 * 1000);
        if (dateFin.getTime() > end.getTime()) dateFin = new Date(end);
      } else {
        // fallback : stages mensuels à partir de maintenant
        const base = new Date();
        dateDebut = new Date(base.getFullYear(), base.getMonth() + i, 1);
        dateFin = new Date(base.getFullYear(), base.getMonth() + i + 1, 0);
      }
      const pickedNature = pickedNatures[i % Math.max(pickedNatures.length, 1)];
      slots.push({
        ordre: i + 1,
        libelle: `Stage ${i + 1}`,
        dateDebut,
        dateFin,
        siteStageId: pickedSites[i]?.id ?? null,
        natureStageId: pickedNature?.id ?? null,
        service: (pickedNature as any)?.nom ?? null,
        enseignantId: pickedEnseignants[i % Math.max(pickedEnseignants.length, 1)]?.id ?? null,
        statut: StageStatus.EN_ATTENTE,
      });
    }
    // mélanger l'ordre pour que l'aléatoire ne soit pas toujours Stage 1 = même site
    return this.shuffle(slots).map((s, idx) => ({ ...s, ordre: idx + 1, libelle: `Stage ${idx + 1}` }));
  }

  private async enrichSlotsWithRandom(
    manager: EntityManager,
    slots: LigneStageSlot[],
    anneeUniversitaireId: number,
    preferredSiteStageId?: number,
    classeId?: number,
    niveauId?: number,
  ): Promise<Partial<LigneStageSlot>[]> {
    const randomSlots = await this.buildRandomSlots(manager, anneeUniversitaireId, preferredSiteStageId, classeId, niveauId);
    const siteMap = new Map(randomSlots.map((s, i) => [i, s]));
    return slots.map((s, i) => {
      const rnd = siteMap.get(i % randomSlots.length)!;
      return {
        ordre: s.ordre,
        libelle: s.libelle,
        dateDebut: s.dateDebut ?? rnd.dateDebut,
        dateFin: s.dateFin ?? rnd.dateFin,
        siteStageId: s.siteStageId ?? rnd.siteStageId,
        natureStageId: s.natureStageId ?? rnd.natureStageId,
        service: s.service ?? rnd.service,
        enseignantId: (s as any).enseignantId ?? (rnd as any).enseignantId ?? null,
        statut: s.statut ?? StageStatus.EN_ATTENTE,
      };
    });
  }

  private async findOrCreateVacantLigneTx(
    manager: EntityManager,
    classeId: number,
    niveauId: number,
    anneeUniversitaireId: number,
    etablissementId: number,
    siteStageId?: number,
  ): Promise<LigneStage> {
    const ligneRepo = manager.getRepository(LigneStage);
    const slotRepo = manager.getRepository(LigneStageSlot);
    const scopeCreate = {
      classeId,
      niveauId,
      anneeUniversitaireId,
      etablissementId,
    };
    const scopeSearch = {
      anneeUniversitaireId,
      etablissementId,
    };

    // FOR UPDATE incompatible avec outer join (slots) -> verrou sans relations puis reload
    const lockedIds = await ligneRepo.find({
      where: { ...scopeSearch, etudiantId: IsNull() } as any,
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    let candidates: LigneStage[] = [];
    if (lockedIds.length > 0) {
      const ids = lockedIds.map((l) => l.id);
      candidates = await ligneRepo.find({
        where: { id: In(ids) } as any,
        relations: { slots: true },
        order: { id: 'ASC' },
      });
    }

    if (candidates.length > 0) {
      const preferred = siteStageId
        ? candidates.find((l) => l.slots?.some((s) => s.siteStageId === siteStageId))
        : undefined;
      const picked = preferred || candidates[0];
      let needsSave = false;
      if (picked.classeId !== classeId || picked.niveauId !== niveauId) {
        picked.classeId = classeId;
        picked.niveauId = niveauId;
        needsSave = true;
      }
      const hasEmpty = picked.slots?.some((s) => !s.siteStageId || !s.natureStageId || !s.service || !(s as any).enseignantId);
      if (hasEmpty) {
        const enriched = await this.enrichSlotsWithRandom(manager, picked.slots, anneeUniversitaireId, siteStageId, classeId, niveauId);
        for (let i = 0; i < picked.slots.length; i++) {
          Object.assign(picked.slots[i], enriched[i]);
          await slotRepo.save(picked.slots[i]);
        }
      }
      if (needsSave) await ligneRepo.save(picked);
      return picked;
    }

    const template = await ligneRepo.findOne({
      where: scopeSearch as any,
      relations: { slots: true },
      order: { id: 'ASC' },
    });

    const hasRealTemplate =
      !!template?.slots?.length &&
      template.slots.some((s) => s.siteStageId != null || s.natureStageId != null || s.dateDebut != null);

    if (!hasRealTemplate) {
      throw new NotFoundException(
        `Aucune période de stage créée par l'admin pour cette année — créez d'abord une période modèle via "Nouvelle ligne" (même pour tous les étudiants)`,
      );
    }

    const sorted = [...template!.slots].sort((a, b) => a.ordre - b.ordre);
    let slotSources: Partial<LigneStageSlot>[] = sorted.length >= 5 ? sorted.slice(0, 5) : sorted;
    if (slotSources.some((s) => !s.siteStageId || !s.natureStageId || !s.service || !(s as any).enseignantId)) {
      slotSources = await this.enrichSlotsWithRandom(manager, slotSources as LigneStageSlot[], anneeUniversitaireId, siteStageId, classeId, niveauId);
    }

    const ligne = ligneRepo.create({
      ...scopeCreate,
      etudiantId: null,
      slots: slotSources.map((s) =>
        slotRepo.create({
          ordre: s.ordre!,
          libelle: s.libelle || `Stage ${s.ordre}`,
          dateDebut: s.dateDebut ?? null,
          dateFin: s.dateFin ?? null,
          siteStageId: s.siteStageId ?? null,
          natureStageId: s.natureStageId ?? null,
          service: s.service,
          enseignantId: (s as any).enseignantId ?? null,
          statut: StageStatus.EN_ATTENTE,
        }),
      ),
    });

    return ligneRepo.save(ligne);
  }

  async autoAssignAll(tenantId?: number): Promise<AutoAssignAllReport> {
    const report: AutoAssignAllReport = {
      assigned: 0,
      alreadyAssigned: 0,
      skipped: {
        noCurriculum: 0,
        stageDisabled: 0,
        noActiveYear: 0,
        failed: 0,
      },
      failedReasons: [],
    };

    const whereEtudiant: any = {};
    if (tenantId) whereEtudiant.etablissement = { id: tenantId };
    const etudiants = await this.etudiantRepository.find({
      where: whereEtudiant,
      relations: { classe: true, niveau: true, etablissement: true },
    });

    for (const etudiant of etudiants) {
      if (!etudiant.classe?.id || !etudiant.niveau?.id) {
        report.skipped.noCurriculum++;
        continue;
      }
      if (etudiant.etablissement?.stageEnabled === false) {
        report.skipped.stageDisabled++;
        continue;
      }

      const eId = tenantId ?? etudiant.etablissement?.id;
      if (!eId) {
        report.skipped.noCurriculum++;
        continue;
      }

      const anneeActive = await this.anneeRepository.findOne({
        where: { etablissementId: eId, isActive: true },
      });
      if (!anneeActive) {
        report.skipped.noActiveYear++;
        continue;
      }

      const dejaAffecte = await this.ligneStageRepository.findOne({
        where: {
          etudiantId: etudiant.id,
          anneeUniversitaireId: anneeActive.id,
          etablissementId: eId,
        },
      });
      if (dejaAffecte) {
        report.alreadyAssigned++;
        continue;
      }

      const result = await this.autoAssignStage(
        etudiant.id,
        etudiant.classe.id,
        etudiant.niveau.id,
        eId,
      );
      if (result.success) {
        report.assigned++;
      } else {
        report.skipped.failed++;
        report.failedReasons.push({ etudiantId: etudiant.id, reason: result.reason });
      }
    }
    return report;
  }

  // ===================== IMPORT RÉPARTITION XLSX =====================

  private parseDateRange(text: string): { debut: Date; fin: Date } | null {
    const mois: Record<string, number> = {
      janv: 1, janvier: 1, fev: 2, février: 2, mars: 3, avril: 4, mai: 5,
      juin: 6, juil: 7, juillet: 7, aout: 8, août: 8, sept: 9, septembre: 9,
      oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, décembre: 12,
    };
    const clean = text.replace(/\s+/g, ' ').replace(/\s*au\s*/g, ' au ').replace(/\s*-\s*/g, ' au ').trim();
    const parts = clean.split(' au ');
    if (parts.length < 2) return null;

    const guessYear = (month: number): number => {
      const now = new Date();
      const currentYear = now.getFullYear();
      return month < now.getMonth() + 1 ? currentYear + 1 : currentYear;
    };

    // Le mois n'est parfois mentionné qu'une fois pour toute la plage (ex:
    // "05 - 31 janv 2026" = du 5 au 31 janvier 2026) : on ne l'exige donc
    // pas dans chaque partie, il est complété après coup par l'autre partie.
    const parsePart = (s: string): { day: number; month: number; year?: number } | null => {
      const parts2 = s.trim().split(/\s+/);
      let day = 0, month = 0, year: number | undefined;
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
      if (day === 0) return null;
      return { day, month, year };
    };

    const debut = parsePart(parts[0]);
    const fin = parsePart(parts[1]);
    if (!debut || !fin) return null;
    if (debut.month === 0 && fin.month !== 0) debut.month = fin.month;
    if (fin.month === 0 && debut.month !== 0) fin.month = debut.month;
    if (debut.month === 0 || fin.month === 0) return null;
    if (debut.year === undefined && fin.year !== undefined) debut.year = fin.year;
    if (fin.year === undefined && debut.year !== undefined) fin.year = debut.year;
    const y1 = debut.year || guessYear(debut.month);
    const y2 = fin.year || guessYear(fin.month);
    return { debut: new Date(y1, debut.month - 1, debut.day), fin: new Date(y2, fin.month - 1, fin.day) };
  }

  /**
   * Regroupe les lignes "Date/Lieu/Service/Nature" d'une feuille de
   * répartition en groupes par étudiant (nom indicatif), quel que soit le
   * nombre de colonnes avant les créneaux (avec ou sans "N°").
   */
  private parseStageGroups(worksheet: any, headers: string[]) {
    const hasNumCol = headers.some((h) => /^n[°o]?\s*$|^num(e(ro)?)?$/i.test((h || '').trim()));
    const nameCol = hasNumCol ? 2 : 1;
    const progCol = hasNumCol ? 3 : 2;
    const typeCol = hasNumCol ? 4 : 3;
    const stageStartCol = hasNumCol ? 5 : 4;

    const getCellText = (row: any, col: number): string => {
      try {
        const cell = row.getCell(col);
        if (cell.text !== undefined && cell.text !== null) return cell.text.toString().trim();
        if (cell.value !== null && cell.value !== undefined) return String(cell.value).trim();
      } catch {
        // cellule fusionnée illisible
      }
      return '';
    };

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

      const target =
        type === 'date' ? current!.date :
        type === 'lieu' ? current!.lieu :
        type === 'service' ? current!.service : current!.nature;
      for (let c = stageStartCol; c <= Math.min(row.cellCount || 20, 20); c++) {
        const val = getCellText(row, c);
        if (val) target.set(c - stageStartCol + 1, val);
      }
    }

    return groups;
  }

  /**
   * Importe une feuille de répartition (format "Date/Lieu/Service/Nature"
   * par groupe d'étudiant) en lignes de stage, SANS assigner d'étudiant :
   * le nom présent dans le fichier est conservé comme simple indication
   * pour l'affectation manuelle ultérieure.
   */
  async importLignesFromSheet(
    worksheet: any,
    headers: string[],
    sheetName: string,
    anneeUniversitaireId: number,
    classeId?: number,
    niveauId?: number,
    tenantId?: number,
  ): Promise<{ sheetName: string; lignesCreated: number; erreurs: string[] }> {
    const erreurs: string[] = [];
    const groups = this.parseStageGroups(worksheet, headers);

    if (groups.length === 0) {
      return { sheetName, lignesCreated: 0, erreurs: ['Aucune donnée trouvée dans cette feuille'] };
    }

    const annee = await this.anneeRepository.findOne({ where: { id: anneeUniversitaireId } });
    if (!annee) {
      return { sheetName, lignesCreated: 0, erreurs: ["Année universitaire introuvable"] };
    }
    const etablissementId = tenantId || annee.etablissementId;

    let resolvedClasseId = classeId;
    let resolvedNiveauId = niveauId;
    if (!resolvedClasseId || !resolvedNiveauId) {
      const match = sheetName.trim().match(/^([LMD]\d+)[\s_-]+(.+)$/i);
      if (match) {
        const niveauCode = match[1].toUpperCase();
        const classeCode = match[2].trim();
        const classe = await this.classeRepository.findOne({ where: { name: ILike(classeCode) } });
        if (classe) {
          resolvedClasseId = classe.id;
          const niveau = await this.niveauRepository.findOne({ where: { name: ILike(niveauCode), classe: { id: classe.id } } });
          if (niveau) resolvedNiveauId = niveau.id;
        }
      }
    }

    if (!resolvedClasseId || !resolvedNiveauId) {
      return {
        sheetName,
        lignesCreated: 0,
        erreurs: [`Impossible de déterminer le parcours/niveau pour la feuille "${sheetName}"`],
      };
    }

    const allSites = await this.siteStageRepository.find({ select: { id: true, nom: true } });
    const allNatures = await this.natureStageRepository.find({ select: { id: true, nom: true } });
    const siteMap = new Map<string, SiteStage>();
    for (const s of allSites) siteMap.set(s.nom.toLowerCase().trim(), s);
    const natureMap = new Map<string, NatureStage>();
    for (const n of allNatures) natureMap.set(n.nom.toLowerCase().trim(), n);

    const findOrCreateSite = async (nom: string): Promise<SiteStage> => {
      const key = nom.toLowerCase().trim();
      let s: SiteStage | undefined = siteMap.get(key);
      if (!s) {
        const created = this.siteStageRepository.create({ nom: nom.trim() });
        s = await this.siteStageRepository.save(created);
        siteMap.set(key, s);
      }
      return s!;
    };

    const findOrCreateNatureLocal = async (nom: string): Promise<NatureStage> => {
      const key = nom.toLowerCase().trim();
      let n: NatureStage | undefined = natureMap.get(key);
      if (!n) {
        const created = this.natureStageRepository.create({ nom: nom.trim() });
        n = await this.natureStageRepository.save(created);
        natureMap.set(key, n);
      }
      return n!;
    };

    let lignesCreated = 0;

    for (const group of groups) {
      if (group.lieu.size === 0) continue;

      const slots: LigneStageSlot[] = [];
      for (const [stageIdx, lieuName] of group.lieu.entries()) {
        if (!lieuName) continue;
        const siteStage = await findOrCreateSite(lieuName);
        const service = group.service.get(stageIdx) || undefined;
        const natureName = group.nature.get(stageIdx);
        const nature = natureName ? await findOrCreateNatureLocal(natureName) : undefined;
        const dateText = group.date.get(stageIdx);
        const dateRange = dateText ? this.parseDateRange(dateText) : null;

        slots.push(
          this.slotRepository.create({
            ordre: stageIdx,
            libelle: `Stage ${stageIdx}`,
            dateDebut: dateRange?.debut ?? null,
            dateFin: dateRange?.fin ?? null,
            siteStageId: siteStage.id,
            natureStageId: nature?.id,
            service,
            statut: StageStatus.EN_ATTENTE,
          }),
        );
      }

      if (slots.length === 0) continue;

      const ligne = this.ligneStageRepository.create({
        classeId: resolvedClasseId,
        niveauId: resolvedNiveauId,
        anneeUniversitaireId,
        etudiantId: null,
        nomIndicatif: group.name,
        etablissementId,
        slots,
      });
      try {
        await this.ligneStageRepository.save(ligne);
        lignesCreated++;
      } catch (e) {
        erreurs.push(`${group.name}: ${e instanceof Error ? e.message : 'erreur inconnue'}`);
      }
    }

    return { sheetName, lignesCreated, erreurs };
  }

  async getMyStageInfo(etudiantId: number) {
    const ecolagePaid = await this.financeService.hasPaidEcolage(etudiantId);

    const lignes = await this.ligneStageRepository.find({
      where: { etudiantId },
      relations: { slots: { siteStage: true, natureStage: true, enseignant: true }, anneeUniversitaire: true },
      order: { createdAt: 'DESC' },
    });
    lignes.forEach((l) => this.sortSlots(l));

    return { ecolagePaid, lignes };
  }
}
