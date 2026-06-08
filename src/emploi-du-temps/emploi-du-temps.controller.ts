import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EmploiDuTempsService } from './emploi-du-temps.service';
import { CreateEmploiDuTempDto } from './dto/create-emploi-du-temp.dto';
import { UpdateEmploiDuTempDto } from './dto/update-emploi-du-temp.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('emploi-du-temps')
@Controller('emploi-du-temps')
export class EmploiDuTempsController {
  constructor(private readonly emploiDuTempsService: EmploiDuTempsService) {}

  @Post()
  @ApiOperation({ summary: "Créer un créneau d'emploi du temps" })
  create(@Body() createEmploiDuTempDto: CreateEmploiDuTempDto) {
    return this.emploiDuTempsService.create(createEmploiDuTempDto);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer l'emploi du temps (avec filtres optionnels)" })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  @ApiQuery({ name: 'start', required: false, type: String, description: "Format ISO" })
  @ApiQuery({ name: 'end', required: false, type: String, description: "Format ISO" })
  findAll(
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.emploiDuTempsService.findAll(
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
      start,
      end
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Récupérer un créneau par son ID" })
  findOne(@Param('id') id: string) {
    return this.emploiDuTempsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier un créneau" })
  update(@Param('id') id: string, @Body() updateEmploiDuTempDto: UpdateEmploiDuTempDto) {
    return this.emploiDuTempsService.update(+id, updateEmploiDuTempDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Supprimer un créneau" })
  remove(@Param('id') id: string) {
    return this.emploiDuTempsService.remove(+id);
  }
}
