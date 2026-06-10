import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AnneeUniversitaireService } from './annee-universitaire.service';
import { CreateAnneeUniversitaireDto } from './dto/create-annee-universitaire.dto';
import { UpdateAnneeUniversitaireDto } from './dto/update-annee-universitaire.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('annee-universitaire')
@Controller('annee-universitaire')
export class AnneeUniversitaireController {
  constructor(private readonly service: AnneeUniversitaireService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle année universitaire' })
  create(@Body() dto: CreateAnneeUniversitaireDto) {
    return this.service.create(dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer l\'année universitaire active' })
  getActive() {
    return this.service.getActiveYear();
  }

  @Get()
  @ApiOperation({ summary: 'Lister toutes les années universitaires' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une année universitaire par son ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une année universitaire' })
  update(@Param('id') id: string, @Body() dto: UpdateAnneeUniversitaireDto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une année universitaire' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
