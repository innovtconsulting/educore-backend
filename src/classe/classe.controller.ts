import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClasseService } from './classe.service';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';

@ApiTags('classe')
@Controller('classe')
export class ClasseController {
  constructor(private readonly classeService: ClasseService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer une classe', 
    description: 'Permet de créer une nouvelle classe (ex: Informatique) et de l\'associer à des niveaux et établissements.' 
  })
  async create(@Body() createClasseDto: CreateClasseDto) {
    const data = await this.classeService.create(createClasseDto);
    return {
      message: 'Classe créée avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister toutes les classes', 
    description: 'Récupère la liste complète des classes avec leurs relations détaillées.' 
  })
  async findAll() {
    const data = await this.classeService.findAll();
    return {
      message: 'Liste des classes récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une classe par ID', 
    description: 'Affiche les informations détaillées d\'une classe spécifique.' 
  })
  async findOne(@Param('id') id: string) {
    const data = await this.classeService.findOne(+id);
    return {
      message: `Classe #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier une classe', 
    description: 'Met à jour les informations d\'une classe existante.' 
  })
  async update(@Param('id') id: string, @Body() updateClasseDto: UpdateClasseDto) {
    const data = await this.classeService.update(+id, updateClasseDto);
    return {
      message: `Classe #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer une classe', 
    description: 'Supprime une classe du système.' 
  })
  async remove(@Param('id') id: string) {
    await this.classeService.remove(+id);
    return {
      message: `Classe #${id} supprimée avec succès`,
    };
  }
}
