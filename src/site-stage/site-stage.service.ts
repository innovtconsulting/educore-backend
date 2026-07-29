import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, IsNull } from 'typeorm';
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
import { FinanceService } from '../finance/finance.service';

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
    const ligne = await this.findOneLigne(id, tenantId);

    if (dto.etudiantId) {
      const etudiant = await this.etudiantRepository.findOne({ where: { id: dto.etudiantId } });
      if (!etudiant) throw new NotFoundException('Étudiant non trouvé');

      const conflict = await this.ligneStageRepository.findOne({
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
      // TypeORM re-dérive la FK depuis la relation chargée au save() : il
      // faut mettre à jour l'objet ET l'id, sinon l'ancienne relation
      // (étudiant précédent, ou toujours défini si on désaffecte) l'emporte.
      ligne.etudiantId = dto.etudiantId;
      ligne.etudiant = etudiant;
    } else {
      ligne.etudiantId = null;
      ligne.etudiant = null;
    }

    await this.ligneStageRepository.save(ligne);
    return this.findOneLigne(id, tenantId);
  }

  async removeLigne(id: number, tenantId?: number): Promise<void> {
    const ligne = await this.findOneLigne(id, tenantId);
    await this.ligneStageRepository.remove(ligne);
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

    if (dto.libelle !== undefined) slot.libelle = dto.libelle;
    if (dto.dateDebut !== undefined) slot.dateDebut = dto.dateDebut ? new Date(dto.dateDebut) : null;
    if (dto.dateFin !== undefined) slot.dateFin = dto.dateFin ? new Date(dto.dateFin) : null;
    if (dto.siteStageId !== undefined) slot.siteStageId = dto.siteStageId;
    if (dto.natureStageId !== undefined) slot.natureStageId = dto.natureStageId;
    if (dto.service !== undefined) slot.service = dto.service;
    if (dto.enseignantId !== undefined) slot.enseignantId = dto.enseignantId;
    if (dto.statut !== undefined) slot.statut = dto.statut;

    await this.slotRepository.save(slot);
    return this.findOneLigne(ligneId, tenantId);
  }

  async getGrille(
    anneeUniversitaireId: number,
    search?: string,
    page = 1,
    limit = 5,
    tenantId?: number,
    classeIds?: number[],
    niveauId?: number,
    siteStageId?: number,
    natureStageId?: number,
    all = false,
  ): Promise<{ items: LigneStage[]; total: number; page: number; limit: number }> {
    const where: any = { anneeUniversitaireId };
    if (tenantId) where.etablissementId = tenantId;
    if (classeIds && classeIds.length > 0) where.classeId = In(classeIds);
    if (niveauId) where.niveauId = niveauId;

    let lignes = await this.ligneStageRepository.find({
      where,
      relations: this.ligneRelations,
      order: { id: 'ASC' },
    });
    lignes.forEach((l) => this.sortSlots(l));

    if (siteStageId) {
      lignes = lignes.filter((l) => l.slots?.some((s) => s.siteStageId === siteStageId));
    }
    if (natureStageId) {
      lignes = lignes.filter((l) => l.slots?.some((s) => s.natureStageId === natureStageId));
    }
    if (search) {
      const q = search.toLowerCase();
      lignes = lignes.filter((l) => {
        const etudiantMatch = l.etudiant
          ? `${l.etudiant.firstName} ${l.etudiant.lastName}`.toLowerCase().includes(q) ||
            (l.etudiant.matricule && l.etudiant.matricule.toLowerCase().includes(q))
          : false;
        const indicatifMatch = l.nomIndicatif?.toLowerCase().includes(q) ?? false;
        return etudiantMatch || indicatifMatch;
      });
    }

    const total = lignes.length;
    const skip = all ? 0 : (page - 1) * limit;
    const items = all ? lignes : lignes.slice(skip, skip + limit);
    return { items, total, page: all ? 1 : page, limit: all ? total : limit };
  }

  // ===================== AUTO-ASSIGNATION =====================

  /**
   * Cherche une ligne vacante (classe/niveau/année active) et y assigne
   * l'étudiant. Contrairement à l'ancien système, le site n'est plus choisi
   * aléatoirement : il appartient déjà à la ligne. `siteStageId`, s'il est
   * fourni, ne sert qu'à préférer une ligne dont un des créneaux utilise
   * déjà ce site.
   */
  async autoAssignStage(
    etudiantId: number,
    classeId: number,
    niveauId: number,
    etablissementId: number,
    siteStageId?: number,
    _overwrite = false,
  ): Promise<LigneStage | null> {
    const anneeActive = await this.anneeRepository.findOne({
      where: { etablissementId, isActive: true },
    });
    if (!anneeActive) return null;

    const where: any = {
      classeId,
      niveauId,
      anneeUniversitaireId: anneeActive.id,
      etudiantId: IsNull(),
    };

    const candidates = await this.ligneStageRepository.find({
      where,
      relations: { slots: true },
      order: { id: 'ASC' },
    });
    if (candidates.length === 0) return null;

    const preferred = siteStageId
      ? candidates.find((l) => l.slots?.some((s) => s.siteStageId === siteStageId))
      : undefined;
    const ligne = preferred || candidates[0];

    ligne.etudiantId = etudiantId;
    return await this.ligneStageRepository.save(ligne);
  }

  async autoAssignAll(tenantId?: number): Promise<number> {
    const anneeActive = await this.anneeRepository.findOne({
      where: { etablissementId: tenantId, isActive: true },
    });
    if (!anneeActive) return 0;

    const whereEtudiant: any = {};
    if (tenantId) whereEtudiant.etablissement = { id: tenantId };
    const etudiants = await this.etudiantRepository.find({
      where: whereEtudiant,
      relations: { classe: true, niveau: true, etablissement: true },
    });

    let total = 0;
    for (const etudiant of etudiants) {
      if (!etudiant.classe?.id || !etudiant.niveau?.id) continue;

      const dejaAffecte = await this.ligneStageRepository.findOne({
        where: {
          etudiantId: etudiant.id,
          anneeUniversitaireId: anneeActive.id,
        },
      });
      if (dejaAffecte) continue;

      const eId = tenantId ?? etudiant.etablissement?.id;
      if (!eId) continue;
      const result = await this.autoAssignStage(
        etudiant.id,
        etudiant.classe.id,
        etudiant.niveau.id,
        eId,
      );
      if (result) total++;
    }
    return total;
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
      let s = siteMap.get(key);
      if (!s) {
        s = this.siteStageRepository.create({ nom: nom.trim() });
        s = await this.siteStageRepository.save(s);
        siteMap.set(key, s);
      }
      return s;
    };

    const findOrCreateNatureLocal = async (nom: string): Promise<NatureStage> => {
      const key = nom.toLowerCase().trim();
      let n = natureMap.get(key);
      if (!n) {
        n = this.natureStageRepository.create({ nom: nom.trim() });
        n = await this.natureStageRepository.save(n);
        natureMap.set(key, n);
      }
      return n;
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
