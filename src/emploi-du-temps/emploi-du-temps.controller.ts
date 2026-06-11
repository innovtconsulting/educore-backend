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
import { EmploiDuTempsService } from './emploi-du-temps.service';
import { CreateEmploiDuTempDto } from './dto/create-emploi-du-temp.dto';
import { UpdateEmploiDuTempDto } from './dto/update-emploi-du-temp.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('emploi-du-temps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emploi-du-temps')
export class EmploiDuTempsController {
  constructor(private readonly emploiDuTempsService: EmploiDuTempsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: "Créer un créneau d'emploi du temps" })
  create(@Body() createEmploiDuTempDto: CreateEmploiDuTempDto) {
    return this.emploiDuTempsService.create(createEmploiDuTempDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.ETUDIANT, Role.SURVEILLANT)
  @ApiOperation({
    summary: "Récupérer l'emploi du temps (avec filtres optionnels)",
  })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  @ApiQuery({
    name: 'start',
    required: false,
    type: String,
    description: 'Format ISO',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    type: String,
    description: 'Format ISO',
  })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.emploiDuTempsService.findAll(
      paginationQuery,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
      start,
      end,
    );
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.ETUDIANT, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer un créneau par son ID' })
  findOne(@Param('id') id: string) {
    return this.emploiDuTempsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier un créneau' })
  update(
    @Param('id') id: string,
    @Body() updateEmploiDuTempDto: UpdateEmploiDuTempDto,
  ) {
    return this.emploiDuTempsService.update(+id, updateEmploiDuTempDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un créneau' })
  remove(@Param('id') id: string) {
    return this.emploiDuTempsService.remove(+id);
  }
}
