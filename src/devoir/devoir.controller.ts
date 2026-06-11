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
import { Role } from '../user/entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('devoirs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devoirs')
export class DevoirController {
  constructor(private readonly devoirService: DevoirService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({ summary: 'Créer un nouveau devoir' })
  create(@Body() createDevoirDto: CreateDevoirDto, @Request() req: any) {
    return this.devoirService.create(createDevoirDto, req.user);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.ETUDIANT, Role.PARENT)
  @ApiOperation({ summary: 'Lister les devoirs' })
  findAll(@Query() paginationQuery: PaginationQueryDto, @Request() req: any) {
    return this.devoirService.findAll(paginationQuery, req.user);
  }

  @Get('classe/:classeId/niveau/:niveauId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.ETUDIANT, Role.PARENT)
  @ApiOperation({ summary: 'Lister les devoirs par classe et niveau' })
  findByClasse(
    @Param('classeId') classeId: string,
    @Param('niveauId') niveauId: string,
  ) {
    return this.devoirService.findByClasse(+classeId, +niveauId);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.ETUDIANT, Role.PARENT)
  @ApiOperation({ summary: 'Récupérer un devoir par ID' })
  findOne(@Param('id') id: string) {
    return this.devoirService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({ summary: 'Modifier un devoir' })
  update(
    @Param('id') id: string,
    @Body() updateDevoirDto: UpdateDevoirDto,
    @Request() req: any,
  ) {
    return this.devoirService.update(+id, updateDevoirDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT)
  @ApiOperation({ summary: 'Supprimer un devoir' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.devoirService.remove(+id, req.user);
  }
}
