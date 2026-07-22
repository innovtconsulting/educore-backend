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
import { SanctionService } from './sanction.service';
import { CreateSanctionDto } from './dto/create-sanction.dto';
import { UpdateSanctionDto } from './dto/update-sanction.dto';
import { SanctionFilterDto } from './dto/sanction-filter.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('sanctions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sanctions')
export class SanctionController {
  constructor(private readonly sanctionService: SanctionService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SURVEILLANT)
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({ summary: 'Créer une nouvelle sanction' })
  async create(
    @Body() createSanctionDto: CreateSanctionDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.sanctionService.create(createSanctionDto, tenantId);
    return {
      message: 'Sanction créée avec succès',
      data,
    };
  }

  @Get()
  @Roles(Role.ADMIN, Role.SURVEILLANT, Role.ENSEIGNANT)
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({ summary: 'Récupérer toutes les sanctions' })
  async findAll(
    @Query() filterDto: SanctionFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.sanctionService.findAll(filterDto, tenantId);
    return {
      message: 'Liste des sanctions récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.SURVEILLANT,
    Role.ENSEIGNANT,
    Role.ETUDIANT,
    Role.PARENT,
  )
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({ summary: 'Récupérer une sanction par son ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.sanctionService.findOne(id, tenantId);
    return {
      message: `Sanction #${id} récupérée avec succès`,
      data,
    };
  }

  @Get('etudiant/:etudiantId')
  @Roles(
    Role.ADMIN,
    Role.SURVEILLANT,
    Role.ENSEIGNANT,
    Role.ETUDIANT,
    Role.PARENT,
  )
  @ApiOperation({ summary: "Récupérer toutes les sanctions d'un étudiant" })
  async findByEtudiant(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.sanctionService.findByEtudiant(
      etudiantId,
      tenantId,
    );
    return {
      message: `Sanctions de l'étudiant #${etudiantId} récupérées avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SURVEILLANT)
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({ summary: 'Mettre à jour une sanction' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSanctionDto: UpdateSanctionDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.sanctionService.update(
      id,
      updateSanctionDto,
      tenantId,
    );
    return {
      message: `Sanction #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SURVEILLANT)
  @Permissions('DISCIPLINE_MANAGE')
  @ApiOperation({ summary: 'Supprimer une sanction' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.sanctionService.remove(id, tenantId);
    return {
      message: `Sanction #${id} supprimée avec succès`,
    };
  }
}
