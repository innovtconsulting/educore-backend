import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';
import { Role } from '../user/entities/user.entity';
import { NoteService } from '../note/note.service';

@ApiTags('evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluations')
export class EvaluationRoutesController {
  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly noteService: NoteService,
  ) {}

  @Get('student/me')
  @Roles(Role.ETUDIANT)
  @ApiOperation({
    summary: "Récupérer les évaluations et notes de l'étudiant connecté",
  })
  async findMine(
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.evaluationService.findMyStudentEvaluations(
      req.user,
      tenantId,
    );
    return { message: 'Évaluations récupérées avec succès', data };
  }

  @Get('student/:id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.PARENT,
    Role.ETUDIANT,
  )
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: "Récupérer les évaluations et notes d'un étudiant",
  })
  async findForStudent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.evaluationService.getStudentEvaluationSummary(
      id,
      req.user,
      tenantId,
    );
    return { message: 'Évaluations récupérées avec succès', data };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({ summary: 'Créer une évaluation' })
  create(
    @Body() createEvaluationDto: CreateEvaluationDto,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.evaluationService.create(
      createEvaluationDto,
      req.user,
      tenantId,
    );
  }

  @Post(':id/notes')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @Permissions('ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Saisir une ou plusieurs notes pour une évaluation',
  })
  createNotes(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.noteService.createForEvaluation(id, body, req.user, tenantId);
  }

  @Get('bulletin/:studentId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.PARENT,
    Role.ETUDIANT,
  )
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: "Préparer les données de bulletin d'un étudiant",
  })
  async getBulletin(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Request() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.evaluationService.getStudentBulletinSummary(
      studentId,
      req.user,
      tenantId,
    );
    return { message: 'Bulletin récupéré avec succès', data };
  }
}
