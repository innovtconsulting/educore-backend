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
import { SalleService } from './salle.service';
import { CreateSalleDto } from './dto/create-salle.dto';
import { UpdateSalleDto } from './dto/update-salle.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('salles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salles')
export class SalleController {
  constructor(private readonly salleService: SalleService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({ summary: 'Créer une nouvelle salle' })
  create(
    @Body() createSalleDto: CreateSalleDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.salleService.create(createSalleDto, tenantId);
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({ summary: 'Lister toutes les salles' })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.salleService.findAll(paginationQuery, tenantId);
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({ summary: 'Récupérer une salle par ID' })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.salleService.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({ summary: 'Modifier une salle' })
  update(
    @Param('id') id: string,
    @Body() updateSalleDto: UpdateSalleDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.salleService.update(+id, updateSalleDto, tenantId);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({ summary: 'Supprimer une salle' })
  remove(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.salleService.remove(+id, tenantId);
  }
}
