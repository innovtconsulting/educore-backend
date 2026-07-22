import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as mammoth from 'mammoth';
import * as ExcelJS from 'exceljs';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SiteStageService } from './site-stage.service';
import { CreateSiteStageDto } from './dto/create-site-stage.dto';
import { UpdateSiteStageDto } from './dto/update-site-stage.dto';
import { CreatePeriodeStageDto } from './dto/create-periode-stage.dto';
import { UpdatePeriodeStageDto } from './dto/update-periode-stage.dto';
import { CreateAffectationStageDto } from './dto/create-affectation-stage.dto';
import { UpdateAffectationStageDto } from './dto/update-affectation-stage.dto';
import { AffectationStageFilterDto } from './dto/affectation-stage-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etudiant } from '../etudiant/entities/etudiant.entity';

@ApiTags('sites-stage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SiteStageController {
  constructor(
    private readonly siteStageService: SiteStageService,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
  ) {}

  // ===================== SITES DE STAGE =====================

  @Post('sites-stage')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Créer un site de stage' })
  async createSite(@Body() dto: CreateSiteStageDto) {
    const data = await this.siteStageService.createSite(dto);
    return { message: 'Site de stage créé avec succès', data };
  }

  @Get('sites-stage')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Lister tous les sites de stage' })
  async findAllSites(
    @Query('search') search?: string,
    @Query('natureStageId') natureStageId?: string,
    @Query('capaciteMin') capaciteMin?: string,
  ) {
    const data = await this.siteStageService.findAllSites(
      search,
      natureStageId ? +natureStageId : undefined,
      capaciteMin ? +capaciteMin : undefined,
    );
    return { message: 'Liste des sites de stage récupérée avec succès', data };
  }

  @Get('sites-stage/:id')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Détail d\'un site de stage' })
  async findOneSite(@Param('id') id: string) {
    const data = await this.siteStageService.findOneSite(+id);
    return { message: `Site de stage #${id} récupéré avec succès`, data };
  }

  @Patch('sites-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Modifier un site de stage' })
  async updateSite(
    @Param('id') id: string,
    @Body() dto: UpdateSiteStageDto,
  ) {
    const data = await this.siteStageService.updateSite(+id, dto);
    return { message: `Site de stage #${id} mis à jour avec succès`, data };
  }

  @Delete('sites-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Supprimer un site de stage' })
  async removeSite(@Param('id') id: string) {
    await this.siteStageService.removeSite(+id);
    return { message: `Site de stage #${id} supprimé avec succès` };
  }

  // ===================== PÉRIODES DE STAGE =====================

  @Post('periodes-stage')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Créer une période de stage' })
  async createPeriode(
    @Body() dto: CreatePeriodeStageDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.createPeriode(dto, tenantId);
    return { message: 'Période de stage créée avec succès', data };
  }

  @Get('periodes-stage')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Lister les périodes de stage' })
  async findAllPeriodes(
    @Query('search') search?: string,
    @Query('anneeUniversitaireId') anneeUniversitaireId?: string,
    @Query('dateDebutMin') dateDebutMin?: string,
    @Query('dateDebutMax') dateDebutMax?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.findAllPeriodes(
      search,
      tenantId,
      anneeUniversitaireId ? parseInt(anneeUniversitaireId) : undefined,
      dateDebutMin,
      dateDebutMax,
    );
    return {
      message: 'Liste des périodes de stage récupérée avec succès',
      data,
    };
  }

  @Get('periodes-stage/:id')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Détail d\'une période de stage' })
  async findOnePeriode(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.findOnePeriode(+id, tenantId);
    return { message: `Période de stage #${id} récupérée avec succès`, data };
  }

  @Patch('periodes-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Modifier une période de stage' })
  async updatePeriode(
    @Param('id') id: string,
    @Body() dto: UpdatePeriodeStageDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.updatePeriode(+id, dto, tenantId);
    return { message: `Période de stage #${id} mise à jour avec succès`, data };
  }

  @Delete('periodes-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Supprimer une période de stage' })
  async removePeriode(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.siteStageService.removePeriode(+id, tenantId);
    return { message: `Période de stage #${id} supprimée avec succès` };
  }

  // ===================== AFFECTATIONS =====================

  @Post('affectations-stage')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Affecter un étudiant à un site de stage' })
  async createAffectation(
    @Body() dto: CreateAffectationStageDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.createAffectation(dto, tenantId);
    return { message: 'Affectation créée avec succès', data };
  }

  @Get('affectations-stage')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Lister les affectations' })
  async findAllAffectations(
    @Query() filter: AffectationStageFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.findAllAffectations(
      filter,
      tenantId,
    );
    return {
      message: 'Liste des affectations récupérée avec succès',
      data,
    };
  }

  @Get('affectations-stage/grille')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Grille des affectations par étudiant et par période' })
  async getGrilleAffectations(
    @Query('anneeUniversitaireId') anneeUniversitaireId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.getGrilleAffectations(
      +anneeUniversitaireId,
      search,
      page ? +page : 1,
      limit ? +limit : 20,
      tenantId,
    );
    return {
      message: 'Grille des affectations récupérée avec succès',
      data,
    };
  }

  @Get('affectations-stage/:id')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Détail d\'une affectation' })
  async findOneAffectation(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.findOneAffectation(+id, tenantId);
    return {
      message: `Affectation #${id} récupérée avec succès`,
      data,
    };
  }

  @Get('etudiants/:etudiantId/affectations-stage')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Stages d\'un étudiant' })
  async findByEtudiant(
    @Param('etudiantId') etudiantId: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.findByEtudiant(
      +etudiantId,
      tenantId,
    );
    return {
      message: 'Affectations de l\'étudiant récupérées avec succès',
      data,
    };
  }

  @Get('sites-stage/:siteId/affectations')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Étudiants d\'un site de stage' })
  async findBySite(
    @Param('siteId') siteId: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.findBySite(+siteId, tenantId);
    return {
      message: 'Affectations du site récupérées avec succès',
      data,
    };
  }

  @Post('etudiants/:etudiantId/affectations-stage/auto-assign')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Assigner aléatoirement un étudiant à tous les stages de l\'année' })
  async autoAssignStudent(
    @Param('etudiantId') etudiantId: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: +etudiantId },
      relations: { classe: true, niveau: true, etablissement: true },
    });
    if (!etudiant) throw new NotFoundException('Étudiant non trouvé');

    const affectations = await this.siteStageService.autoAssignStage(
      etudiant.id,
      etudiant.classe.id,
      etudiant.niveau.id,
      etudiant.etablissement?.id ?? tenantId,
      undefined,
      true,
    );
    return {
      message: `${affectations.length} affectation(s) créée(s) avec succès`,
      data: affectations,
    };
  }

  @Post('affectations-stage/auto-assign-all')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Assigner aléatoirement tous les étudiants aux stages de l\'année' })
  async autoAssignAllStudents(@CurrentEtablissement() tenantId?: number) {
    const total = await this.siteStageService.autoAssignAll(tenantId);
    return { message: `${total} affectation(s) créée(s) avec succès` };
  }

  @Patch('affectations-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Modifier une affectation (statut, site, tuteur)' })
  async updateAffectation(
    @Param('id') id: string,
    @Body() dto: UpdateAffectationStageDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.siteStageService.updateAffectation(
      +id,
      dto,
      tenantId,
    );
    return {
      message: `Affectation #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete('affectations-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Supprimer une affectation' })
  async removeAffectation(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.siteStageService.removeAffectation(+id, tenantId);
    return { message: `Affectation #${id} supprimée avec succès` };
  }

  // ===================== NATURES DE STAGE =====================

  @Post('natures-stage')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Créer une nature de stage' })
  async createNatureStage(@Body() dto: any) {
    const data = await this.siteStageService.createNatureStage(dto);
    return { message: 'Nature de stage créée avec succès', data };
  }

  @Get('natures-stage')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Lister toutes les natures de stage' })
  async findAllNaturesStage() {
    const data = await this.siteStageService.findAllNaturesStage();
    return { message: 'Liste des natures de stage récupérée avec succès', data };
  }

  @Get('natures-stage/:id')
  @Permissions('STAGE_VIEW')
  @ApiOperation({ summary: 'Détail d\'une nature de stage' })
  async findOneNatureStage(@Param('id') id: string) {
    const data = await this.siteStageService.findOneNatureStage(+id);
    return { message: `Nature de stage #${id} récupérée avec succès`, data };
  }

  @Patch('natures-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Modifier une nature de stage' })
  async updateNatureStage(@Param('id') id: string, @Body() dto: any) {
    const data = await this.siteStageService.updateNatureStage(+id, dto);
    return { message: `Nature de stage #${id} mise à jour avec succès`, data };
  }

  @Delete('natures-stage/:id')
  @Permissions('STAGE_MANAGE')
  @ApiOperation({ summary: 'Supprimer une nature de stage' })
  async removeNatureStage(@Param('id') id: string) {
    await this.siteStageService.removeNatureStage(+id);
    return { message: `Nature de stage #${id} supprimée avec succès` };
  }

  @Get('stage/etudiant/me')
  @Roles(Role.ETUDIANT)
  @ApiOperation({ summary: 'Mon stage (avec vérification du paiement des écolages)' })
  async getMyStage(@Request() req: any) {
    const etudiantId = req.user.etudiantId;
    const data = await this.siteStageService.getMyStageInfo(etudiantId);
    return {
      message: 'Informations de stage récupérées avec succès',
      data,
    };
  }

  // ===================== IMPORT =====================

  @Post('import/sites')
  @Permissions('STAGE_MANAGE')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Importer les sites de stage depuis un fichier DOCX' })
  async importSitesFromDocx(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis');

    const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer as any });
    const html = htmlResult.value;

    const cellText = (cell: string): string =>
      cell.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, m => {
        const map: Record<string, string> = { '&amp;': '&', '&agrave;': 'à', '&egrave;': 'è', '&eacute;': 'é', '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û', '&ecirc;': 'ê', '&ccedil;': 'ç', '&rsquo;': "'", '&nbsp;': ' ' };
        return map[m] || m;
      }).replace(/\s+/g, ' ').trim();

    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

    const knownNatures = [
      'Santé publique', 'Santé Publique', 'Maladie Infectieuse et parasitaire',
      'Chirurgie pediatrique', 'Chirurgie thoracique', 'Oncologie pediatrique', 'Oncologie adulte',
      'Médecine generale', 'Medecine generale', 'medecine specifique', 'Médecine spécifique',
      'Traumato A', 'Traumato B', 'Traumato D', 'Viscerale A', 'Viscerale B', 'URO A', 'URO B',
      'Reanimation medicales', 'Réanimation médicales',
      'Maternité', 'Maternite', 'Médecine', 'Medecine', 'Chirurgie',
      'Pédiatrie', 'Pediatrie', 'Laboratoire', 'Vaccination', 'PF',
      'Neuro', 'Réanimation', 'Reanimation', 'Oncologie',
      'Neurologie', 'Psychologie', 'A.T.U', 'Néphrologie', 'Nephrologie',
      'Dermatologie', 'Rhumatologie', 'Endocrinologie', 'PSA', 'PSB',
      'Cardiologie', 'USIC', 'Pneumologie', 'Santé',
    ].sort((a, b) => b.length - a.length);

    const splitNatures = (text: string): string[] => {
      if (!text) return [];
      if (text.startsWith('-')) {
        return text.split('-').filter(Boolean).map(s => s.replace(/=\d+$/, '').trim());
      }
      const result: string[] = [];
      let remaining = text;
      while (remaining.length > 0) {
        remaining = remaining.trim();
        if (!remaining) break;
        let matched = false;
        for (const kn of knownNatures) {
          if (remaining.toUpperCase().startsWith(kn.toUpperCase())) {
            result.push(kn);
            remaining = remaining.slice(kn.length);
            matched = true;
            break;
          }
        }
        if (!matched) {
          const next = remaining.search(/[a-zéèêëàâùûüôöîïç][A-ZÉÈÊËÀÂÙÛÜÔÖÎÏÇ]/);
          if (next > 0) {
            result.push(remaining.slice(0, next + 1));
            remaining = remaining.slice(next + 1);
          } else {
            result.push(remaining);
            break;
          }
        }
      }
      return result.map(s => s.trim()).filter(Boolean);
    };

    const isHeaderRow = (cells: string[]): boolean =>
      cells.some(c => /^(site\s+de\s+stage|nature\s+de\s+stage|responsable|capacité|service)/i.test(c))
      || cells.some(c => /^liste\s+des\s+sites/i.test(c));

    const isCapacityRow = (cells: string[]): boolean =>
      cells.length <= 2 && cells.every(c => /^\d+$/.test(c.trim()));

    let sitesCreated = 0;
    let naturesCreated = 0;

    const allTables: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = tableRegex.exec(html)) !== null) allTables.push(tm[1]);

    for (const tableBody of allTables) {
      const rows: string[] = [];
      let rm: RegExpExecArray | null;
      while ((rm = rowRegex.exec(tableBody)) !== null) rows.push(rm[1]);

      if (rows.length < 2) continue;

      for (let r = 0; r < rows.length; r++) {
        const cells = [...rows[r].matchAll(cellRegex)].map(m => cellText(m[1]));
        if (cells.length < 2 || isHeaderRow(cells) || isCapacityRow(cells)) continue;

        let siteName: string;
        let natureText: string;
        let responsable = '';
        let capacite: number | undefined;

        if (cells.length >= 5) {
          // Tableau CHU : [prefix, location/natures, natures, resp, cap]
          if (!cells[0] && cells[1]) {
            siteName = cells[1];
            natureText = cells[2];
          } else {
            const second = cells[1] || '';
            const isLocLike = second.length < 30 && !knownNatures.some(k => second.toUpperCase().startsWith(k.toUpperCase()));
            siteName = isLocLike ? `${cells[0]} ${second}`.trim() : cells[0];
            natureText = isLocLike ? cells[2] : second;
          }
          responsable = cells[3] || '';
          capacite = parseInt(cells[4]) || undefined;
        } else {
          // Tableau standard 4 colonnes : [site, natures, resp, cap]
          siteName = cells[0];
          natureText = cells[1];
          responsable = cells[2] || '';
          capacite = parseInt(cells[3]) || undefined;
        }

        // Nettoie le nom du site
        const sdspIdx = siteName.search(/\bSDSP\b/i);
        if (sdspIdx >= 0) siteName = siteName.slice(0, sdspIdx).trim();
        siteName = siteName.replace(/\s*\([^)]+\)/, '').trim();
        if (!siteName || siteName.length < 3) continue;

        const natures = [...new Set(splitNatures(natureText))];

        const site = await this.siteStageService.createSite({
          nom: siteName,
          responsable,
          capacite,
          description: natures.join(', '),
        }, natures);
        sitesCreated++;

        naturesCreated += natures.length;
      }
    }

    return {
      message: 'Import terminé',
      data: { sitesCreated, naturesCreated },
    };
  }

  @Post('import/repartition')
  @Permissions('STAGE_MANAGE')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Importer la répartition des stages depuis un fichier XLSX' })
  async importRepartition(
    @UploadedFile() file: Express.Multer.File,
    @CurrentEtablissement() tenantId?: number,
  ) {
    if (!file) throw new BadRequestException('Fichier requis');

    const { Readable } = require('stream');
    const stream = Readable.from(file.buffer);
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {});

    const results: any[] = [];
    let totalAffectations = 0;

    for await (const worksheet of reader) {
      const sheetName = (worksheet as any).name;
      const headers: string[] = [];
      const rows: any[][] = [];
      let isHeader = true;

      for await (const row of worksheet) {
        const values: string[] = [];
        for (let c = 1; c <= (row.cellCount || 0); c++) {
          const cell = row.getCell(c);
          const text = cell?.text ?? cell?.value;
          values.push(text !== undefined && text !== null ? String(text).trim() : '');
        }
        if (isHeader) {
          headers.push(...values);
          isHeader = false;
        } else {
          rows.push(values);
        }
      }

      const mockWorksheet = {
        name: sheetName,
        rowCount: rows.length + 1,
        getRow: (r: number) => {
          const vals = r === 1 ? headers : (rows[r - 2] || []);
          return {
            getCell: (c: number) => {
              const v = vals[c - 1] ?? '';
              return { text: v, value: v };
            },
            cellCount: vals.length,
          };
        },
      };

      const sheetResult = await this.siteStageService.importRepartitionSheet(
        mockWorksheet,
        headers,
        sheetName,
        tenantId,
      );
      results.push(sheetResult);
      totalAffectations += sheetResult.affectationsCreated;
    }

    return {
      message: 'Import de la répartition terminé',
      data: { feuilles: results, totalAffectations },
    };
  }
}
