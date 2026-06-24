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
  ParseIntPipe,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { BulkCreateNoteDto } from './dto/bulk-create-note.dto';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('note')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Enregistrer une note',
    description:
      'Attribue une note à un étudiant pour une évaluation spécifique.',
  })
  create(
    @Body() createNoteDto: CreateNoteDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.noteService.create(createNoteDto, req.user, tenantId);
  }

  @Post('bulk')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Enregistrer des notes en masse',
    description:
      'Permet à un enseignant ou administrateur de saisir les notes de plusieurs étudiants pour une évaluation.',
  })
  bulkCreate(
    @Body() bulkCreateNoteDto: BulkCreateNoteDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.noteService.bulkCreate(bulkCreateNoteDto, req.user, tenantId);
  }

  @Get('etudiant/:etudiantId')
  @Roles(Role.PARENT, Role.ETUDIANT)
  @ApiOperation({
    summary: "Lister les notes d'un étudiant",
    description:
      'Parents : notes de leurs enfants. Étudiants : uniquement les leurs.',
  })
  async findByEtudiant(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Query() paginationQuery: PaginationQueryDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.noteService.findAll(
      paginationQuery,
      req.user,
      etudiantId,
      tenantId,
    );
    return {
      message: 'Liste des notes récupérée avec succès',
      data,
    };
  }

  @Get()
  @Roles(Role.ETUDIANT, Role.PARENT)
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister les notes',
    description:
      "Étudiant : ses notes. Parent : notes d'un enfant (etudiantId requis). Staff : liste filtrée.",
  })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('etudiantId') etudiantId: string | undefined,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.noteService.findAll(
      paginationQuery,
      req.user,
      etudiantId ? +etudiantId : undefined,
      tenantId,
    );
    return {
      message: 'Liste des notes récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Roles(Role.ETUDIANT)
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer une note par ID',
    description: "Affiche les détails d'une note individuelle.",
  })
  findOne(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.noteService.findOne(+id, req.user, tenantId);
  }

  @Patch(':id')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Modifier une note',
    description: "Permet de corriger la valeur d'une note déjà saisie.",
  })
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.noteService.update(+id, updateNoteDto, req.user, tenantId);
  }

  @Delete(':id')
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Supprimer une note',
    description: 'Supprime une note du système.',
  })
  remove(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.noteService.remove(+id, req.user, tenantId);
  }
}
