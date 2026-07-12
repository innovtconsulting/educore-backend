import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmploiDuTempsService } from './emploi-du-temps.service';
import { CreateEmploiDuTempDto } from './dto/create-emploi-du-temp.dto';
import { UpdateEmploiDuTempDto } from './dto/update-emploi-du-temp.dto';
import { CreateEvenementDto } from './dto/create-evenement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('emploi-du-temps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emploi-du-temps')
export class EmploiDuTempsController {
  constructor(private readonly emploiDuTempsService: EmploiDuTempsService) {}

  @Post()
  @Permissions('SCHEDULE_MANAGE')
  @ApiOperation({ summary: "Créer un créneau d'emploi du temps" })
  create(@Body() createEmploiDuTempDto: CreateEmploiDuTempDto) {
    return this.emploiDuTempsService.create(createEmploiDuTempDto);
  }

  @Post('evenement')
  @Permissions('SCHEDULE_MANAGE')
  @ApiOperation({
    summary:
      "Créer un événement (sans matière) ciblant plusieurs niveaux/parcours, ou tout l'établissement",
  })
  createEvenement(
    @Body() createEvenementDto: CreateEvenementDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.emploiDuTempsService.createEvenement(
      createEvenementDto,
      tenantId,
    );
  }

  @Get()
  @Roles(Role.ETUDIANT, Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({
    summary: "Récupérer l'emploi du temps (avec filtres optionnels)",
  })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  @ApiQuery({ name: 'enseignantId', required: false, type: Number })
  @ApiQuery({
    name: 'start',
    required: false,
    type: String,
    description: 'Format ISO',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    type: String,
    description: 'Format ISO',
  })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @Query('enseignantId') enseignantId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.emploiDuTempsService.findAll(
      paginationQuery,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
      start,
      end,
      enseignantId ? +enseignantId : undefined,
      tenantId,
    );
  }

  @Get('hours')
  @Roles(Role.ETUDIANT, Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({
    summary:
      'Calculer le nombre total d heures effectuées pour une matière et un enseignant',
  })
  @ApiQuery({ name: 'enseignantId', required: true, type: Number })
  @ApiQuery({ name: 'matiereId', required: true, type: Number })
  @ApiQuery({
    name: 'start',
    required: false,
    type: String,
    description: 'Date de début du filtre (format ISO)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    type: String,
    description: 'Date de fin du filtre (format ISO)',
  })
  getTotalHoursByTeacherAndSubject(
    @Query('enseignantId') enseignantId: string,
    @Query('matiereId') matiereId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.emploiDuTempsService.getTotalHoursByTeacherAndSubject(
      +enseignantId,
      +matiereId,
      start,
      end,
      tenantId,
    );
  }

  @Get(':id')
  @Roles(Role.ETUDIANT, Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer un créneau par son ID' })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.emploiDuTempsService.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('SCHEDULE_MANAGE')
  @ApiOperation({ summary: 'Modifier un créneau' })
  update(
    @Param('id') id: string,
    @Body() updateEmploiDuTempDto: UpdateEmploiDuTempDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.emploiDuTempsService.update(
      +id,
      updateEmploiDuTempDto,
      tenantId,
    );
  }

  @Delete(':id')
  @Permissions('SCHEDULE_MANAGE')
  @ApiOperation({ summary: 'Supprimer un créneau' })
  remove(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.emploiDuTempsService.remove(+id, tenantId);
  }
}
