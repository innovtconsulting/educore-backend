import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { CreatePaieDto } from './dto/create-paie.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('personnel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('personnel')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Post()
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Créer un membre du personnel' })
  async create(
    @Body() dto: CreatePersonnelDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.personnelService.create(dto, tenantId);
    return { message: 'Personnel créé avec succès', data };
  }

  @Get()
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Lister tout le personnel' })
  async findAll(@CurrentEtablissement() tenantId?: number) {
    const data = await this.personnelService.findAll(tenantId);
    return { message: 'Liste du personnel récupérée', data };
  }

  @Get('search-users')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: "Rechercher des utilisateurs (staff) à lier au personnel" })
  async searchUsers(
    @Query('search') search: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.personnelService.searchUsers(search, tenantId);
    return { message: 'Utilisateurs récupérés', data };
  }

  @Get(':id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: "Détail d'un membre du personnel avec ses paies" })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.personnelService.findOne(id, tenantId);
    return { message: 'Personnel récupéré', data };
  }

  @Patch(':id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Modifier un membre du personnel' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePersonnelDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.personnelService.update(id, dto, tenantId);
    return { message: 'Personnel modifié avec succès', data };
  }

  @Delete(':id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Supprimer un membre du personnel' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.personnelService.remove(id, tenantId);
    return { message: 'Personnel supprimé avec succès' };
  }

  // --- Paie ---

  @Post(':id/paies')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: "Enregistrer une paie (avance ou solde) pour un personnel" })
  async createPaie(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaieDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.personnelService.createPaie(id, dto, tenantId);
    return { message: 'Paie enregistrée avec succès', data };
  }

  @Get(':id/paies')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: "Résumé des paies d'un personnel (avance/solde par mois)" })
  async getPaieSummary(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.personnelService.getPaieSummary(id, tenantId);
    return { message: 'Résumé des paies récupéré', data };
  }
}
