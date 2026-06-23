import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DisciplineService } from './discipline.service';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { Discipline, DisciplineCategory } from './entities/discipline.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('discipline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Post()
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({
    summary: 'Créer une règle de discipline ou règlement intérieur',
    description: 'Enregistre une nouvelle règle dans le système.',
  })
  @ApiResponse({ status: 201, type: Discipline })
  create(@Body() createDisciplineDto: CreateDisciplineDto) {
    return this.disciplineService.create(createDisciplineDto);
  }

  @Get()
  @Roles(Role.ETUDIANT, Role.PARENT, Role.ENSEIGNANT, Role.SURVEILLANT)
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({
    summary: 'Lister toutes les règles de discipline',
    description:
      'Récupère la liste complète des disciplines et règlements intérieurs. Peut être filtré par catégorie.',
  })
  @ApiResponse({ status: 200, type: [Discipline] })
  findAll(@Query('category') category?: DisciplineCategory) {
    return this.disciplineService.findAll(category);
  }

  @Get(':id')
  @Roles(Role.ETUDIANT, Role.PARENT, Role.ENSEIGNANT, Role.SURVEILLANT)
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({
    summary: 'Récupérer une règle par ID',
    description: "Affiche les détails d'une règle spécifique.",
  })
  @ApiResponse({ status: 200, type: Discipline })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.disciplineService.findOne(id);
  }

  @Patch(':id')
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({
    summary: 'Modifier une règle de discipline',
    description: "Met à jour le contenu ou le titre d'une règle.",
  })
  @ApiResponse({ status: 200, type: Discipline })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
  ) {
    return this.disciplineService.update(id, updateDisciplineDto);
  }

  @Delete(':id')
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({
    summary: 'Supprimer une règle de discipline',
    description: 'Supprime définitivement une règle du système.',
  })
  @ApiResponse({ status: 200, description: 'Règle supprimée avec succès' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.disciplineService.remove(id);
  }
}

