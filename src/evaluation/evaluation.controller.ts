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
import { Role } from '../user/entities/user.entity';

@ApiTags('evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({ 
    summary: 'Créer une évaluation', 
    description: 'Permet de créer un Contrôle Continu (CC), un Examen ou un Projet pour une matière et un semestre donnés.' 
  })
  create(@Body() createEvaluationDto: CreateEvaluationDto, @Request() req: any) {
    return this.evaluationService.create(createEvaluationDto, req.user);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.SURVEILLANT)
  @ApiOperation({ 
    summary: 'Lister toutes les évaluations', 
    description: 'Récupère la liste complète des évaluations avec leurs relations (matière, classe, niveau, semestre).' 
  })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const data = await this.evaluationService.findAll(paginationQuery);
    return {
      message: 'Liste des évaluations récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.SURVEILLANT)
  @ApiOperation({ 
    summary: 'Récupérer une évaluation par ID', 
    description: 'Affiche les détails d\'une évaluation spécifique.' 
  })
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({ 
    summary: 'Modifier une évaluation', 
    description: 'Permet de mettre à jour le titre, le poids ou la date d\'une évaluation.' 
  })
  update(
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
    @Request() req: any
  ) {
    return this.evaluationService.update(+id, updateEvaluationDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({ 
    summary: 'Supprimer une évaluation', 
    description: 'Supprime définitivement une évaluation du système.' 
  })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.evaluationService.remove(+id, req.user);
  }
}
