import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatiereService } from './matiere.service';
import { CreateMatiereDto } from './dto/create-matiere.dto';
import { UpdateMatiereDto } from './dto/update-matiere.dto';
import { MatiereFilterDto } from './dto/matiere-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('matiere')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matiere')
export class MatiereController {
  constructor(private readonly matiereService: MatiereService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Créer une matière',
    description:
      "Enregistre une nouvelle unité d'enseignement avec son code unique et son coefficient, associée à un niveau.",
  })
  async create(
    @Body() createMatiereDto: CreateMatiereDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.matiereService.create(createMatiereDto, tenantId);
    return {
      message: 'Matière créée avec succès',
      data,
    };
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister toutes les matières',
    description:
      'Récupère la liste complète des matières avec filtres par niveau ou parcours.',
  })
  async findAll(
    @Query() filter: MatiereFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.matiereService.findAll(filter, tenantId);
    return {
      message: 'Liste des matières récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer une matière par ID',
    description:
      "Affiche les informations détaillées d'une matière spécifique.",
  })
  async findOne(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.matiereService.findOne(+id, tenantId);
    return {
      message: `Matière #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Modifier une matière',
    description:
      "Permet de mettre à jour le nom, le code ou le coefficient d'une matière.",
  })
  async update(
    @Param('id') id: string,
    @Body() updateMatiereDto: UpdateMatiereDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.matiereService.update(
      +id,
      updateMatiereDto,
      tenantId,
    );
    return {
      message: `Matière #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Supprimer une matière',
    description: 'Supprime définitivement une matière du système.',
  })
  async remove(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.matiereService.remove(+id, tenantId);
    return {
      message: `Matière #${id} supprimée avec succès`,
    };
  }
}
