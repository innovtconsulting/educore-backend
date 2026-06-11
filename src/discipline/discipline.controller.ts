import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DisciplineService } from './discipline.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { Discipline } from './entities/discipline.entity';

@ApiTags('discipline')
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer une règle de discipline ou règlement intérieur',
    description: 'Enregistre une nouvelle règle dans le système.'
  })
  @ApiResponse({ status: 201, type: Discipline })
  create(@Body() createDisciplineDto: CreateDisciplineDto) {
    return this.disciplineService.create(createDisciplineDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister toutes les règles de discipline',
    description: 'Récupère la liste complète des disciplines et règlements intérieurs.'
  })
  @ApiResponse({ status: 200, type: [Discipline] })
  findAll() {
    return this.disciplineService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une règle par ID',
    description: 'Affiche les détails d\'une règle spécifique.'
  })
  @ApiResponse({ status: 200, type: Discipline })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.disciplineService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier une règle de discipline',
    description: 'Met à jour le contenu ou le titre d\'une règle.'
  })
  @ApiResponse({ status: 200, type: Discipline })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
  ) {
    return this.disciplineService.update(id, updateDisciplineDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer une règle de discipline',
    description: 'Supprime définitivement une règle du système.'
  })
  @ApiResponse({ status: 200, description: 'Règle supprimée avec succès' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.disciplineService.remove(id);
  }
}
