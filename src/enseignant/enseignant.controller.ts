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
import { EnseignantService } from './enseignant.service';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('enseignants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enseignants')
export class EnseignantController {
  constructor(private readonly enseignantService: EnseignantService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Créer un nouvel enseignant' })
  create(@Body() createEnseignantDto: CreateEnseignantDto) {
    return this.enseignantService.create(createEnseignantDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Récupérer tous les enseignants avec leurs affectations',
  })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.enseignantService.findAll(paginationQuery);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Récupérer un enseignant par son ID' })
  findOne(@Param('id') id: string) {
    return this.enseignantService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier un enseignant' })
  update(
    @Param('id') id: string,
    @Body() updateEnseignantDto: UpdateEnseignantDto,
  ) {
    return this.enseignantService.update(+id, updateEnseignantDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un enseignant' })
  remove(@Param('id') id: string) {
    return this.enseignantService.remove(+id);
  }

  @Post(':id/affectations')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Ajouter un enseignement (affectation) à un enseignant',
  })
  addAffectation(
    @Param('id') id: string,
    @Body() createAffectationDto: CreateAffectationDto,
  ) {
    return this.enseignantService.addAffectation(+id, createAffectationDto);
  }

  @Delete('affectations/:affectationId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un enseignement (affectation)' })
  removeAffectation(@Param('affectationId') affectationId: string) {
    return this.enseignantService.removeAffectation(+affectationId);
  }
}
