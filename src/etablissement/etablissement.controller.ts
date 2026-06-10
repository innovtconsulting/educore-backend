import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EtablissementService } from './etablissement.service';
import { CreateEtablissementDto } from './dto/create-etablissement.dto';
import { UpdateEtablissementDto } from './dto/update-etablissement.dto';

@ApiTags('etablissement')
@Controller('etablissement')
export class EtablissementController {
  constructor(private readonly etablissementService: EtablissementService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer un établissement', 
    description: 'Permet d\'enregistrer un nouvel établissement (FST, ESP, etc.) dans le système.' 
  })
  async create(@Body() createEtablissementDto: CreateEtablissementDto) {
    const data = await this.etablissementService.create(createEtablissementDto);
    return {
      message: 'Etablissement créé avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister tous les établissements', 
    description: 'Récupère la liste complète des établissements enregistrés.' 
  })
  async findAll() {
    const data = await this.etablissementService.findAll();
    return data;
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer un établissement par ID', 
    description: 'Affiche les informations détaillées d\'un établissement spécifique.' 
  })
  async findOne(@Param('id') id: string) {
    const data = await this.etablissementService.findOne(+id);
    return {
      message: `Etablissement #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier un établissement', 
    description: 'Met à jour les coordonnées ou le nom d\'un établissement.' 
  })
  async update(@Param('id') id: string, @Body() updateEtablissementDto: UpdateEtablissementDto) {
    const data = await this.etablissementService.update(+id, updateEtablissementDto);
    return {
      message: `Etablissement #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer un établissement', 
    description: 'Supprime un établissement du système.' 
  })
  async remove(@Param('id') id: string) {
    await this.etablissementService.remove(+id);
    return {
      message: `Etablissement #${id} supprimé avec succès`,
    };
  }
}
