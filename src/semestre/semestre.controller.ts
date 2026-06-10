import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SemestreService } from './semestre.service';
import { CreateSemestreDto } from './dto/create-semestre.dto';
import { UpdateSemestreDto } from './dto/update-semestre.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('semestre')
@Controller('semestre')
export class SemestreController {
  constructor(private readonly semestreService: SemestreService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Créer un semestre', 
    description: 'Définit une période académique (Semestre 1 ou 2) rattachée à une année universitaire.' 
  })
  create(@Body() createSemestreDto: CreateSemestreDto) {
    return this.semestreService.create(createSemestreDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister tous les semestres', 
    description: 'Récupère tous les semestres enregistrés, incluant leur année universitaire de rattachement.' 
  })
  findAll() {
    return this.semestreService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer un semestre par ID', 
    description: 'Affiche les détails d\'un semestre spécifique.' 
  })
  findOne(@Param('id') id: string) {
    return this.semestreService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Modifier un semestre', 
    description: 'Met à jour les dates ou le libellé d\'un semestre.' 
  })
  update(
    @Param('id') id: string,
    @Body() updateSemestreDto: UpdateSemestreDto,
  ) {
    return this.semestreService.update(+id, updateSemestreDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Supprimer un semestre', 
    description: 'Supprime un semestre du système.' 
  })
  remove(@Param('id') id: string) {
    return this.semestreService.remove(+id);
  }
}
