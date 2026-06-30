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
  bulkRecord(@Body() bulkRecordPresenceDto: BulkRecordPresenceDto, @CurrentEtablissement() tenantId?: number) {
    return this.presenceService.bulkRecord(bulkRecordPresenceDto, tenantId);
  }

  @Get()
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Liste de toutes les présences' })
  findAll(@Query() filterDto: PresenceFilterDto, @CurrentEtablissement() tenantId?: number) {
    return this.presenceService.findAll(filterDto, tenantId);
  }

  @Get('sessions-summary')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Résumé des présences par créneau (session)' })
  getSessionsSummary(@Query() filterDto: PresenceFilterDto, @CurrentEtablissement() tenantId?: number) {
    return this.presenceService.getSessionsSummary(filterDto, tenantId);
  }

  @Get('session/:id')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: "Récupérer les présences d'un créneau spécifique" })
  findBySession(@Param('id', ParseIntPipe) id: number, @CurrentEtablissement() tenantId?: number) {
    return this.presenceService.findBySession(id, tenantId);
  }

  @Get('etudiant/:id')
  @Roles(Role.PARENT, Role.ETUDIANT)
  @ApiOperation({
    summary: "Statistiques et historique de présence d'un étudiant",
  })
  getStudentStats(@Param('id', ParseIntPipe) id: number, @Request() req: any, @CurrentEtablissement() tenantId?: number) {
    return this.presenceService.getStudentStats(id, req.user, tenantId);
  }
}
