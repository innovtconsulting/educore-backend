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
import { NiveauService } from './niveau.service';
import { CreateNiveauDto } from './dto/create-niveau.dto';
import { UpdateNiveauDto } from './dto/update-niveau.dto';
import { NiveauFilterDto } from './dto/niveau-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('niveau')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('niveau')
export class NiveauController {
  constructor(private readonly niveauService: NiveauService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Créer un niveau',
    description:
      "Ajoute un nouveau niveau d'étude (Licence 1, Master 2, etc.) et l'associe à un parcours.",
  })
  async create(
    @Body() createNiveauDto: CreateNiveauDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.niveauService.create(createNiveauDto, tenantId);
    return {
      message: 'Niveau créé avec succès',
      data,
    };
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister tous les niveaux',
    description:
      "Récupère la liste complète des niveaux d'étude disponibles, avec filtres.",
  })
  async findAll(
    @Query() filter: NiveauFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.niveauService.findAll(filter, tenantId);
    return {
      message: 'Liste des niveaux récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer un niveau par ID',
    description: "Affiche les informations d'un niveau spécifique.",
  })
  async findOne(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.niveauService.findOne(+id, tenantId);
    return {
      message: `Niveau #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Modifier un niveau',
    description: "Permet de mettre à jour le libellé d'un niveau d'étude.",
  })
  async update(
    @Param('id') id: string,
    @Body() updateNiveauDto: UpdateNiveauDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.niveauService.update(
      +id,
      updateNiveauDto,
      tenantId,
    );
    return {
      message: `Niveau #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Supprimer un niveau',
    description: "Supprime un niveau d'étude du système.",
  })
  async remove(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.niveauService.remove(+id, tenantId);
    return {
      message: `Niveau #${id} supprimé avec succès`,
    };
  }
}
