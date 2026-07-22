import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgressionService } from './progression.service';
import { GetProgressionQueryDto } from './dto/get-progression-query.dto';
import { ToggleChapitreProgressionDto } from './dto/toggle-chapitre-progression.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('progression')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matiere/:matiereId/progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get()
  @Roles(Role.ENSEIGNANT, Role.SURVEILLANT, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({
    summary: "Récupérer l'état de progression des chapitres d'une matière pour un niveau (année active)",
  })
  getProgression(
    @Param('matiereId', ParseIntPipe) matiereId: number,
    @Query() query: GetProgressionQueryDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.progressionService.getProgression(matiereId, query.niveauId, tenantId);
  }

  @Patch(':chapitreId')
  @Roles(Role.ENSEIGNANT, Role.SURVEILLANT, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: 'Marquer un chapitre comme terminé ou non' })
  toggle(
    @Param('matiereId', ParseIntPipe) matiereId: number,
    @Param('chapitreId') chapitreId: string,
    @Body() dto: ToggleChapitreProgressionDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.progressionService.toggle(matiereId, chapitreId, dto, req.user, tenantId);
  }
}
