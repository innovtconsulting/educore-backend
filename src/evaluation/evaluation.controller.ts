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
  Request,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Créer une évaluation',
    description:
      'Permet de créer un Contrôle Continu (CC), un Examen ou un Projet pour une matière et un semestre donnés.',
  })
  create(
    @Body() createEvaluationDto: CreateEvaluationDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.evaluationService.create(createEvaluationDto, req.user, tenantId);
  }

  @Get()
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT, Role.ETUDIANT)
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister toutes les évaluations',
    description:
      'Récupère la liste complète des évaluations avec leurs relations (matière, classe, niveau, semestre).',
  })
  async findAll(@Query() paginationQuery: PaginationQueryDto, @CurrentEtablissement() tenantId?: number) {
    const data = await this.evaluationService.findAll(paginationQuery, tenantId);
    return {
      message: 'Liste des évaluations récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer une évaluation par ID',
    description: "Affiche les détails d'une évaluation spécifique.",
  })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.evaluationService.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Modifier une évaluation',
    description:
      "Permet de mettre à jour le titre, le poids ou la date d'une évaluation.",
  })
  update(
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.evaluationService.update(+id, updateEvaluationDto, req.user, tenantId);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Supprimer une évaluation',
    description: 'Supprime définitivement une évaluation du système.',
  })
  remove(@Param('id') id: string, @Request() req: any, @CurrentEtablissement() tenantId?: number) {
    return this.evaluationService.remove(+id, req.user, tenantId);
  }
}
