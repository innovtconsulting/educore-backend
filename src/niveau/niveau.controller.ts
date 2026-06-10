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
import { NiveauService } from './niveau.service';
import { CreateNiveauDto } from './dto/create-niveau.dto';
import { UpdateNiveauDto } from './dto/update-niveau.dto';

@ApiTags('niveau')
@Controller('niveau')
export class NiveauController {
  constructor(private readonly niveauService: NiveauService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer un niveau', 
    description: 'Ajoute un nouveau niveau d\'étude (Licence 1, Master 2, etc.) dans le système.' 
  })
  async create(@Body() createNiveauDto: CreateNiveauDto) {
    const data = await this.niveauService.create(createNiveauDto);
    return {
      message: 'Niveau créé avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister tous les niveaux', 
    description: 'Récupère la liste complète des niveaux d\'étude disponibles.' 
  })
  async findAll() {
    const data = await this.niveauService.findAll();
    return {
      message: 'Liste des niveaux récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer un niveau par ID', 
    description: 'Affiche les informations d\'un niveau spécifique.' 
  })
  async findOne(@Param('id') id: string) {
    const data = await this.niveauService.findOne(+id);
    return {
      message: `Niveau #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier un niveau', 
    description: 'Permet de mettre à jour le libellé d\'un niveau d\'étude.' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateNiveauDto: UpdateNiveauDto,
  ) {
    const data = await this.niveauService.update(+id, updateNiveauDto);
    return {
      message: `Niveau #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer un niveau', 
    description: 'Supprime un niveau d\'étude du système.' 
  })
  async remove(@Param('id') id: string) {
    await this.niveauService.remove(+id);
    return {
      message: `Niveau #${id} supprimé avec succès`,
    };
  }
}
