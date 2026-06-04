import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NiveauService } from './niveau.service';
import { CreateNiveauDto } from './dto/create-niveau.dto';
import { UpdateNiveauDto } from './dto/update-niveau.dto';

@ApiTags('niveau')
@Controller('niveau')
export class NiveauController {
  constructor(private readonly niveauService: NiveauService) {}

  @Post()
  async create(@Body() createNiveauDto: CreateNiveauDto) {
    const data = await this.niveauService.create(createNiveauDto);
    return {
      message: 'Niveau créé avec succès',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.niveauService.findAll();
    return {
      message: 'Liste des niveaux récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.niveauService.findOne(+id);
    return {
      message: `Niveau #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateNiveauDto: UpdateNiveauDto) {
    const data = await this.niveauService.update(+id, updateNiveauDto);
    return {
      message: `Niveau #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.niveauService.remove(+id);
    return {
      message: `Niveau #${id} supprimé avec succès`,
    };
  }
}
