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
} from '@nestjs/common';
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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('sites-stage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SiteStageController {
  constructor(private readonly siteStageService: SiteStageService) {}

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
  async findAllSites(@Query('search') search?: string) {
    const data = await this.siteStageService.findAllSites(search);
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
}
