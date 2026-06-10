import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('evaluation')
@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer une évaluation', 
    description: 'Permet de créer un Contrôle Continu (CC), un Examen ou un Projet pour une matière et un semestre donnés.' 
  })
  create(@Body() createEvaluationDto: CreateEvaluationDto) {
    return this.evaluationService.create(createEvaluationDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister toutes les évaluations', 
    description: 'Récupère la liste complète des évaluations avec leurs relations (matière, classe, niveau, semestre).' 
  })
  findAll() {
    return this.evaluationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une évaluation par ID', 
    description: 'Affiche les détails d\'une évaluation spécifique.' 
  })
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier une évaluation', 
    description: 'Permet de mettre à jour les informations (titre, poids, date) d\'une évaluation.' 
  })
  update(
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
  ) {
    return this.evaluationService.update(+id, updateEvaluationDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer une évaluation', 
    description: 'Supprime définitivement une évaluation du système.' 
  })
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(+id);
  }
}
