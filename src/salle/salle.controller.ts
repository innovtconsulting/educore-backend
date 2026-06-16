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
import { SalleService } from './salle.service';
import { CreateSalleDto } from './dto/create-salle.dto';
import { UpdateSalleDto } from './dto/update-salle.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('salles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salles')
export class SalleController {
  constructor(private readonly salleService: SalleService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Créer une nouvelle salle' })
  create(@Body() createSalleDto: CreateSalleDto) {
    return this.salleService.create(createSalleDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Lister toutes les salles' })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.salleService.findAll(paginationQuery);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ENSEIGNANT, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer une salle par ID' })
  findOne(@Param('id') id: string) {
    return this.salleService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier une salle' })
  update(@Param('id') id: string, @Body() updateSalleDto: UpdateSalleDto) {
    return this.salleService.update(+id, updateSalleDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer une salle' })
  remove(@Param('id') id: string) {
    return this.salleService.remove(+id);
  }
}
