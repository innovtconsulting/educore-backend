import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AnneeUniversitaireService } from './annee-universitaire.service';
import { CreateAnneeUniversitaireDto } from './dto/create-annee-universitaire.dto';
import { UpdateAnneeUniversitaireDto } from './dto/update-annee-universitaire.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('annee-universitaire')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('annee-universitaire')
export class AnneeUniversitaireController {
  constructor(private readonly service: AnneeUniversitaireService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({ summary: 'Créer une nouvelle année universitaire' })
  create(
    @Body() dto: CreateAnneeUniversitaireDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.service.create(dto, tenantId);
  }

  @Get('active')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({ summary: "Récupérer l'année universitaire active" })
  getActive(@CurrentEtablissement() tenantId?: number) {
    return this.service.getActiveYear(tenantId);
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({ summary: 'Lister toutes les années universitaires' })
  findAll(@CurrentEtablissement() tenantId?: number) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({ summary: 'Récupérer une année universitaire par son ID' })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.service.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({ summary: 'Modifier une année universitaire' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnneeUniversitaireDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.service.update(+id, dto, tenantId);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({ summary: 'Supprimer une année universitaire' })
  remove(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.service.remove(+id, tenantId);
  }
}
