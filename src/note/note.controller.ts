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
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { BulkCreateNoteDto } from './dto/bulk-create-note.dto';

@ApiTags('note')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({
    summary: 'Enregistrer une note',
    description:
      'Attribue une note à un étudiant pour une évaluation spécifique.',
  })
  create(@Body() createNoteDto: CreateNoteDto, @Request() req: any) {
    return this.noteService.create(createNoteDto, req.user);
  }

  @Post('bulk')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({
    summary: 'Enregistrer des notes en masse',
    description:
      'Permet à un enseignant ou administrateur de saisir les notes de plusieurs étudiants pour une évaluation.',
  })
  bulkCreate(
    @Body() bulkCreateNoteDto: BulkCreateNoteDto,
    @Request() req: any,
  ) {
    return this.noteService.bulkCreate(bulkCreateNoteDto, req.user);
  }

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.SURVEILLANT,
    Role.ETUDIANT,
  )
  @ApiOperation({
    summary: 'Lister toutes les notes',
    description:
      "Récupère la liste des notes. Si c'est un étudiant, il ne voit que les siennes.",
  })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Request() req: any,
  ) {
    const data = await this.noteService.findAll(paginationQuery, req.user);
    return {
      message: 'Liste des notes récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.SURVEILLANT,
    Role.ETUDIANT,
  )
  @ApiOperation({
    summary: 'Récupérer une note par ID',
    description: "Affiche les détails d'une note individuelle.",
  })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.noteService.findOne(+id, req.user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({
    summary: 'Modifier une note',
    description: "Permet de corriger la valeur d'une note déjà saisie.",
  })
  update(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
    @Request() req: any,
  ) {
    return this.noteService.update(+id, updateNoteDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({
    summary: 'Supprimer une note',
    description: 'Supprime une note du système.',
  })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.noteService.remove(+id, req.user);
  }
}
