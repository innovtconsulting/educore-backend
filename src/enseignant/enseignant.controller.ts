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
  Request,
  NotFoundException,
} from '@nestjs/common';
import { EnseignantService } from './enseignant.service';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { EnseignantFilterDto } from './dto/enseignant-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('enseignants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enseignants')
export class EnseignantController {
  constructor(private readonly enseignantService: EnseignantService) {}

  @Post()
  @Permissions('TEACHER_MANAGE')
  @ApiOperation({ summary: 'Créer un nouvel enseignant' })
  create(@Body() createEnseignantDto: CreateEnseignantDto, @CurrentEtablissement() tenantId?: number) {
    return this.enseignantService.create(createEnseignantDto, tenantId);
  }

  @Get('me')
  @Roles(Role.ENSEIGNANT)
  @ApiOperation({ summary: 'Récupérer le profil de l\'enseignant connecté avec ses affectations' })
  async getMe(@Request() req: any) {
    const enseignantId = req.user?.enseignantId;
    if (!enseignantId) throw new NotFoundException('Profil enseignant introuvable');
    return this.enseignantService.findOne(enseignantId);
  }

  @Get()
  @Permissions('TEACHER_VIEW')
  @ApiOperation({
    summary: 'Récupérer tous les enseignants avec leurs affectations',
  })
  findAll(
    @Query() filter: EnseignantFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.enseignantService.findAll(filter, tenantId);
  }

  @Get(':id')
  @Permissions('TEACHER_VIEW')
  @ApiOperation({ summary: 'Récupérer un enseignant par son ID' })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.enseignantService.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('TEACHER_MANAGE')
  @ApiOperation({ summary: 'Modifier un enseignant' })
  update(
    @Param('id') id: string,
    @Body() updateEnseignantDto: UpdateEnseignantDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.enseignantService.update(+id, updateEnseignantDto, tenantId);
  }

  @Delete(':id')
  @Permissions('TEACHER_MANAGE')
  @ApiOperation({ summary: 'Supprimer un enseignant' })
  remove(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.enseignantService.remove(+id, tenantId);
  }

  @Post(':id/reset-credentials')
  @Permissions('TEACHER_MANAGE')
  @ApiOperation({ summary: 'Réinitialiser les identifiants de connexion d\'un enseignant (mot de passe → 12345678)' })
  resetCredentials(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.enseignantService.resetCredentials(+id, tenantId);
  }

  @Post(':id/affectations')
  @Permissions('TEACHER_MANAGE')
  @ApiOperation({
    summary: 'Ajouter un enseignement (affectation) à un enseignant',
  })
  addAffectation(
    @Param('id') id: string,
    @Body() createAffectationDto: CreateAffectationDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.enseignantService.addAffectation(+id, createAffectationDto, tenantId);
  }

  @Delete('affectations/:affectationId')
  @Permissions('TEACHER_MANAGE')
  @ApiOperation({ summary: 'Supprimer un enseignement (affectation)' })
  removeAffectation(@Param('affectationId') affectationId: string) {
    return this.enseignantService.removeAffectation(+affectationId);
  }
}
