import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { DevoirService } from './devoir.service';
import { CreateDevoirDto } from './dto/create-devoir.dto';
import { UpdateDevoirDto } from './dto/update-devoir.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('devoirs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devoirs')
export class DevoirController {
  constructor(private readonly devoirService: DevoirService) {}

  @Post()
  @Roles(Role.ENSEIGNANT)
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({ summary: 'Créer un nouveau devoir' })
  create(
    @Body() createDevoirDto: CreateDevoirDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.devoirService.create(createDevoirDto, req.user, tenantId);
  }

  @Get('teacher')
  @Roles(Role.ENSEIGNANT)
  @ApiOperation({ summary: "Lister les devoirs de l'enseignant connecté" })
  findForTeacher(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const paginationQuery: PaginationQueryDto = {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    };
    return this.devoirService.findByTeacher(
      req.user.enseignantId,
      paginationQuery,
      tenantId,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
    );
  }

  @Get()
  @Roles(Role.ETUDIANT, Role.PARENT)
  @ApiOperation({ summary: 'Lister les devoirs' })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.devoirService.findAll(paginationQuery, req.user, tenantId);
  }

  @Get('classe/:classeId/niveau/:niveauId')
  @Roles(Role.ETUDIANT, Role.PARENT)
  @ApiOperation({ summary: 'Lister les devoirs par classe et niveau' })
  findByClasse(
    @Param('classeId') classeId: string,
    @Param('niveauId') niveauId: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.devoirService.findByClasse(+classeId, +niveauId, tenantId);
  }

  @Get(':id')
  @Roles(Role.ETUDIANT, Role.PARENT, Role.ENSEIGNANT)
  @ApiOperation({ summary: 'Récupérer un devoir par ID' })
  findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    return this.devoirService.findOne(+id, tenantId);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({ summary: 'Modifier un devoir' })
  update(
    @Param('id') id: string,
    @Body() updateDevoirDto: UpdateDevoirDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.devoirService.update(+id, updateDevoirDto, req.user, tenantId);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({ summary: 'Supprimer un devoir' })
  remove(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.devoirService.remove(+id, req.user, tenantId);
  }

  // --- Submissions ---

  @Post(':id/soumissions')
  @Roles(Role.ETUDIANT)
  @ApiOperation({ summary: 'Soumettre un rendu pour un devoir' })
  async createSubmission(
    @Param('id') id: string,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @Request() req: any,
  ) {
    const data = await this.devoirService.createSubmission(
      +id,
      createSubmissionDto,
      req.user,
    );
    return {
      message: 'Rendu soumis avec succès',
      data,
    };
  }

  @Get(':id/soumissions')
  @Roles(Role.ENSEIGNANT)
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({ summary: 'Lister tous les rendus pour un devoir' })
  async findAllSubmissions(@Param('id') id: string, @Request() req: any) {
    const data = await this.devoirService.findAllSubmissions(+id, req.user);
    return {
      message: 'Liste des rendus récupérée avec succès',
      data,
    };
  }

  @Get(':id/soumissions/me')
  @Roles(Role.ETUDIANT)
  @ApiOperation({ summary: 'Récupérer mon rendu pour un devoir spécifique' })
  async findMySubmission(@Param('id') id: string, @Request() req: any) {
    const data = await this.devoirService.findMySubmission(+id, req.user);
    return {
      message: 'Votre rendu a été récupéré avec succès',
      data,
    };
  }

  @Delete('soumissions/:id')
  @Roles(Role.ETUDIANT)
  @ApiOperation({ summary: 'Supprimer une soumission' })
  async removeSubmission(@Param('id') id: string, @Request() req: any) {
    await this.devoirService.removeSubmission(+id, req.user);
    return {
      message: 'Rendu supprimé avec succès',
    };
  }
}
