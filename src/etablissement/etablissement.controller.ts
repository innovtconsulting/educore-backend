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
  async create(@Body() createEtablissementDto: CreateEtablissementDto) {
    const data = await this.etablissementService.create(createEtablissementDto);
    return {
      message: 'Etablissement créé avec succès',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.etablissementService.findAll();
    return data;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.etablissementService.findOne(+id);
    return {
      message: `Etablissement #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateEtablissementDto: UpdateEtablissementDto) {
    const data = await this.etablissementService.update(+id, updateEtablissementDto);
    return {
      message: `Etablissement #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.etablissementService.remove(+id);
    return {
      message: `Etablissement #${id} supprimé avec succès`,
    };
  }
}
