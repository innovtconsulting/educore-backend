import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('journal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get('slots')
  @Roles(Role.ENSEIGNANT, Role.MONITRICE, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({
    summary: 'Liste des créneaux avec le statut de leur cahier de journal',
  })
  listSlots(
    @Query() filter: JournalFilterDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.journalService.listSlots(filter, req.user, tenantId);
  }

  @Post()
  @Roles(Role.ENSEIGNANT, Role.MONITRICE, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: 'Créer le journal d’un créneau' })
  create(
    @Body() dto: CreateJournalDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.journalService.create(dto, req.user, tenantId);
  }

  @Patch(':id')
  @Roles(Role.ENSEIGNANT, Role.MONITRICE, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: 'Modifier le journal d’un créneau' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJournalDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.journalService.update(id, dto, req.user, tenantId);
  }

  @Get(':id')
  @Roles(Role.ENSEIGNANT, Role.MONITRICE, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: 'Récupérer un journal par son ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.journalService.findOne(id, tenantId);
  }

  @Get(':id/history')
  @Roles(Role.ENSEIGNANT, Role.MONITRICE, Role.ADMIN)
  @Permissions('JOURNAL_MANAGE')
  @ApiOperation({ summary: "Historique des modifications d'un journal" })
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.journalService.getHistory(id, tenantId);
  }
}
