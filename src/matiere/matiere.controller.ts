import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MatiereService } from './matiere.service';
import { CreateMatiereDto } from './dto/create-matiere.dto';
import { UpdateMatiereDto } from './dto/update-matiere.dto';

@ApiTags('matiere')
@Controller('matiere')
export class MatiereController {
  constructor(private readonly matiereService: MatiereService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer une matière', 
    description: 'Enregistre une nouvelle unité d\'enseignement avec son code unique et son coefficient.' 
  })
  async create(@Body() createMatiereDto: CreateMatiereDto) {
    const data = await this.matiereService.create(createMatiereDto);
    return {
      message: 'Matière créée avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister toutes les matières', 
    description: 'Récupère la liste complète des matières enregistrées dans le système.' 
  })
  async findAll() {
    const data = await this.matiereService.findAll();
    return {
      message: 'Liste des matières récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une matière par ID', 
    description: 'Affiche les informations détaillées d\'une matière spécifique.' 
  })
  async findOne(@Param('id') id: string) {
    const data = await this.matiereService.findOne(+id);
    return {
      message: `Matière #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier une matière', 
    description: 'Permet de mettre à jour le nom, le code ou le coefficient d\'une matière.' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateMatiereDto: UpdateMatiereDto,
  ) {
    const data = await this.matiereService.update(+id, updateMatiereDto);
    return {
      message: `Matière #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer une matière', 
    description: 'Supprime définitivement une matière du système.' 
  })
  async remove(@Param('id') id: string) {
    await this.matiereService.remove(+id);
    return {
      message: `Matière #${id} supprimée avec succès`,
    };
  }
}
