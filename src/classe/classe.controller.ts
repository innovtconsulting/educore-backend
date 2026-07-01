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
import { ClasseService } from './classe.service';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('classe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classe')
export class ClasseController {
  constructor(private readonly classeService: ClasseService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Créer un parcours (classe)',
    description:
      "Permet de créer un nouveau parcours (classe) et de l'associer à un établissement.",
  })
  async create(
    @Body() createClasseDto: CreateClasseDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.classeService.create(createClasseDto, tenantId);
    return {
      message: 'Parcours (classe) créé avec succès',
      data,
    };
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister tous les parcours (classes)',
    description:
      'Récupère la liste complète des parcours (classes) avec leurs relations détaillées.',
  })
  async findAll(
    @CurrentEtablissement() tenantId?: number,
    @Query('etablissementId') etablissementId?: string,
  ) {
    const data = await this.classeService.findAll(
      tenantId,
      etablissementId ? +etablissementId : undefined,
    );
    return {
      message: 'Liste des parcours (classes) récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer une classe par ID',
    description: "Affiche les informations détaillées d'une classe spécifique.",
  })
  async findOne(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.classeService.findOne(+id, tenantId);
    return {
      message: `Classe #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Modifier une classe',
    description: "Met à jour les informations d'une classe existante.",
  })
  async update(
    @Param('id') id: string,
    @Body() updateClasseDto: UpdateClasseDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.classeService.update(
      +id,
      updateClasseDto,
      tenantId,
    );
    return {
      message: `Classe #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Supprimer une classe',
    description: 'Supprime une classe du système.',
  })
  async remove(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.classeService.remove(+id, tenantId);
    return {
      message: `Classe #${id} supprimée avec succès`,
    };
  }
}
