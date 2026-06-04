import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClasseService } from './classe.service';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';

@ApiTags('classe')
@Controller('classe')
export class ClasseController {
  constructor(private readonly classeService: ClasseService) {}

  @Post()
  async create(@Body() createClasseDto: CreateClasseDto) {
    const data = await this.classeService.create(createClasseDto);
    return {
      message: 'Classe créée avec succès',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.classeService.findAll();
    return {
      message: 'Liste des classes récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.classeService.findOne(+id);
    return {
      message: `Classe #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateClasseDto: UpdateClasseDto) {
    const data = await this.classeService.update(+id, updateClasseDto);
    return {
      message: `Classe #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.classeService.remove(+id);
    return {
      message: `Classe #${id} supprimée avec succès`,
    };
  }
}
