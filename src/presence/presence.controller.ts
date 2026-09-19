import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import { BulkRecordPresenceDto } from './dto/record-presence.dto';
import { BulkRecordHalfDayPresenceDto, HalfDayPresenceFilterDto } from './dto/bulk-record-halfday.dto';
import { DemiJournee } from './entities/presence.entity';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PresenceFilterDto } from './dto/presence-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('presence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('bulk')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({
    summary: 'Enregistrer les présences pour une session (en masse)',
  })
  bulkRecord(
    @Body() bulkRecordPresenceDto: BulkRecordPresenceDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.bulkRecord(bulkRecordPresenceDto, tenantId);
  }

  // ── Mode primaire Chérubin : demi-journée ───────────────────────────
  @Post('bulk-halfday')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Enregistrer les présences demi-journée (Chérubin – primaire)' })
  bulkRecordHalfDay(
    @Body() dto: BulkRecordHalfDayPresenceDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.bulkRecordHalfDay(dto, tenantId);
  }

  @Get('halfday-sessions')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Résumé présences demi-journée (Chérubin)' })
  getHalfDaySessions(
    @Query() filter: HalfDayPresenceFilterDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.getHalfDaySessionsSummary(
      { ...filter, page: page ? Number(page) : 1, limit: limit ? Number(limit) : 15 } as any,
      tenantId,
    );
  }

  @Get('halfday')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: "Récupérer les présences d'une demi-journée" })
  findByHalfDay(
    @Query('classeId', ParseIntPipe) classeId: number,
    @Query('niveauId', ParseIntPipe) niveauId: number,
    @Query('date') date: string,
    @Query('demiJournee') demiJournee: DemiJournee,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.findByHalfDay(classeId, niveauId, date, demiJournee, tenantId);
  }

  @Get()
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Liste de toutes les présences' })
  findAll(
    @Query() filterDto: PresenceFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.findAll(filterDto, tenantId);
  }

  @Get('sessions-summary')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Résumé des présences par créneau (session)' })
  getSessionsSummary(
    @Query() filterDto: PresenceFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.getSessionsSummary(filterDto, tenantId);
  }

  @Get('session/:id')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: "Récupérer les présences d'un créneau spécifique" })
  findBySession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.findBySession(id, tenantId);
  }

  @Get('etudiant/:id')
  @Roles(
    Role.ADMIN,
    Role.SURVEILLANT,
    Role.ENSEIGNANT,
    Role.PARENT,
    Role.ETUDIANT,
  )
  @ApiOperation({
    summary: "Statistiques et historique de présence d'un étudiant",
  })
  getStudentStats(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.presenceService.getStudentStats(id, req.user, tenantId);
  }
}
