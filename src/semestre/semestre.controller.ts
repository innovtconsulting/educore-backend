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
import { SemestreService } from './semestre.service';
import { CreateSemestreDto } from './dto/create-semestre.dto';
import { UpdateSemestreDto } from './dto/update-semestre.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('semestre')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('semestre')
export class SemestreController {
  constructor(private readonly semestreService: SemestreService) {}

  @Post()
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Créer un semestre',
    description:
      'Définit une période académique (Semestre 1 ou 2) rattachée à une année universitaire.',
  })
  create(
    @Body() createSemestreDto: CreateSemestreDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.semestreService.create(createSemestreDto, tenantId);
  }

  @Get()
  @Roles(
    Role.PARENT,
    Role.ETUDIANT,
    Role.ENSEIGNANT,
    Role.ADMIN,
    Role.MONITRICE,
  )
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister tous les semestres',
    description:
      'Récupère tous les semestres enregistrés, incluant leur année universitaire de rattachement.',
  })
  findAll(@CurrentEtablissement() tenantId?: number) {
    return this.semestreService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer un semestre par ID',
    description: "Affiche les détails d'une semestre spécifique.",
  })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.semestreService.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Modifier un semestre',
    description: "Met à jour les dates ou le libellé d'un semestre.",
  })
  update(
    @Param('id') id: string,
    @Body() updateSemestreDto: UpdateSemestreDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.semestreService.update(+id, updateSemestreDto, tenantId);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_CONFIG')
  @ApiOperation({
    summary: 'Supprimer un semestre',
    description: 'Supprime un semestre du système.',
  })
  remove(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.semestreService.remove(+id, tenantId);
  }
}
