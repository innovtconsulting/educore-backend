import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EnseignantService } from './enseignant.service';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateAffectationDto } from './dto/create-affectation.dto';

@ApiTags('enseignants')
@Controller('enseignants')
export class EnseignantController {
  constructor(private readonly enseignantService: EnseignantService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel enseignant' })
  create(@Body() createEnseignantDto: CreateEnseignantDto) {
    return this.enseignantService.create(createEnseignantDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer tous les enseignants avec leurs affectations',
  })
  findAll() {
    return this.enseignantService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un enseignant par son ID' })
  findOne(@Param('id') id: string) {
    return this.enseignantService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un enseignant' })
  update(
    @Param('id') id: string,
    @Body() updateEnseignantDto: UpdateEnseignantDto,
  ) {
    return this.enseignantService.update(+id, updateEnseignantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un enseignant' })
  remove(@Param('id') id: string) {
    return this.enseignantService.remove(+id);
  }

  @Post(':id/affectations')
  @ApiOperation({
    summary: 'Ajouter un enseignement (affectation) à un enseignant',
  })
  addAffectation(
    @Param('id') id: string,
    @Body() createAffectationDto: CreateAffectationDto,
  ) {
    return this.enseignantService.addAffectation(+id, createAffectationDto);
  }

  @Delete('affectations/:affectationId')
  @ApiOperation({ summary: 'Supprimer un enseignement (affectation)' })
  removeAffectation(@Param('affectationId') affectationId: string) {
    return this.enseignantService.removeAffectation(+affectationId);
  }
}
