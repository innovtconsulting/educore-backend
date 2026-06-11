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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatiereService } from './matiere.service';
import { CreateMatiereDto } from './dto/create-matiere.dto';
import { UpdateMatiereDto } from './dto/update-matiere.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('matiere')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('matiere')
export class MatiereController {
  constructor(private readonly matiereService: MatiereService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Créer une matière', 
    description: 'Enregistre une nouvelle unité d\'enseignement avec son code unique et son coefficient.' 
  })
  async create(@Body() createMatiereDto: CreateMatiereDto) {
    const data = await this.matiereService.create(createMatiereDto);
    return {
      message: 'Matière créée avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lister toutes les matières', 
    description: 'Récupère la liste complète des matières enregistrées dans le système.' 
  })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const data = await this.matiereService.findAll(paginationQuery);
    return {
      message: 'Liste des matières récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Récupérer une matière par ID', 
    description: 'Affiche les informations détaillées d\'une matière spécifique.' 
  })
  async findOne(@Param('id') id: string) {
    const data = await this.matiereService.findOne(+id);
    return {
      message: `Matière #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Modifier une matière', 
    description: 'Permet de mettre à jour le nom, le code ou le coefficient d\'une matière.' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateMatiereDto: UpdateMatiereDto,
  ) {
    const data = await this.matiereService.update(+id, updateMatiereDto);
    return {
      message: `Matière #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Supprimer une matière', 
    description: 'Supprime définitivement une matière du système.' 
  })
  async remove(@Param('id') id: string) {
    await this.matiereService.remove(+id);
    return {
      message: `Matière #${id} supprimée avec succès`,
    };
  }
}
