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
  bulkRecord(@Body() bulkRecordPresenceDto: BulkRecordPresenceDto) {
    return this.presenceService.bulkRecord(bulkRecordPresenceDto);
  }

  @Get()
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: 'Liste de toutes les présences' })
  async findAll(@Query() filterDto: PresenceFilterDto) {
    const data = await this.presenceService.findAll(filterDto);
    return {
      message: 'Liste des présences récupérée avec succès',
      data,
    };
  }

  @Get('session/:id')
  @Roles(Role.ENSEIGNANT, Role.ADMIN, Role.SURVEILLANT)
  @Permissions('ATTENDANCE_MANAGE')
  @ApiOperation({ summary: "Récupérer les présences d'un créneau spécifique" })
  findBySession(@Param('id', ParseIntPipe) id: number) {
    return this.presenceService.findBySession(id);
  }

  @Get('etudiant/:id')
  @Roles(Role.PARENT, Role.ETUDIANT)
  @ApiOperation({
    summary: "Statistiques et historique de présence d'un étudiant",
  })
  getStudentStats(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.presenceService.getStudentStats(id, req.user);
  }
}
