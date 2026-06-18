import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SemestreService } from './semestre.service';
import { CreateSemestreDto } from './dto/create-semestre.dto';
import { UpdateSemestreDto } from './dto/update-semestre.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('semestre')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('semestre')
export class SemestreController {
  constructor(private readonly semestreService: SemestreService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Créer un semestre',
    description:
      'Définit une période académique (Semestre 1 ou 2) rattachée à une année universitaire.',
  })
  create(@Body() createSemestreDto: CreateSemestreDto) {
    return this.semestreService.create(createSemestreDto);
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister tous les semestres',
    description:
      'Récupère tous les semestres enregistrés, incluant leur année universitaire de rattachement.',
  })
  findAll() {
    return this.semestreService.findAll();
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer un semestre par ID',
    description: "Affiche les détails d'une semestre spécifique.",
  })
  findOne(@Param('id') id: string) {
    return this.semestreService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Modifier un semestre',
    description: "Met à jour les dates ou le libellé d'un semestre.",
  })
  update(
    @Param('id') id: string,
    @Body() updateSemestreDto: UpdateSemestreDto,
  ) {
    return this.semestreService.update(+id, updateSemestreDto);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Supprimer un semestre',
    description: 'Supprime un semestre du système.',
  })
  remove(@Param('id') id: string) {
    return this.semestreService.remove(+id);
  }
}
