import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MatiereService } from './matiere.service';
import { CreateMatiereDto } from './dto/create-matiere.dto';
import { UpdateMatiereDto } from './dto/update-matiere.dto';

@ApiTags('matiere')
@Controller('matiere')
export class MatiereController {
  constructor(private readonly matiereService: MatiereService) {}

  @Post()
  async create(@Body() createMatiereDto: CreateMatiereDto) {
    const data = await this.matiereService.create(createMatiereDto);
    return {
      message: 'Matière créée avec succès',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.matiereService.findAll();
    return {
      message: 'Liste des matières récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.matiereService.findOne(+id);
    return {
      message: `Matière #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
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
  async remove(@Param('id') id: string) {
    await this.matiereService.remove(+id);
    return {
      message: `Matière #${id} supprimée avec succès`,
    };
  }
}
