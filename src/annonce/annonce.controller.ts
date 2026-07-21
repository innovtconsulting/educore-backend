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
import { AnnonceService } from './annonce.service';
import { CreateAnnonceDto } from './dto/create-annonce.dto';
import { UpdateAnnonceDto } from './dto/update-annonce.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('annonces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('annonces')
export class AnnonceController {
  constructor(private readonly annonceService: AnnonceService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MONITRICE)
  @ApiOperation({ summary: 'Créer une nouvelle annonce' })
  async create(
    @Body() createAnnonceDto: CreateAnnonceDto,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.annonceService.create(
      createAnnonceDto,
      user,
      tenantId,
    );
    return {
      message: 'Annonce créée avec succès',
      data,
    };
  }

  @Get()
  @Roles(
    UserRole.ETUDIANT,
    UserRole.PARENT,
    UserRole.ENSEIGNANT,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.COMPTABLE,
    UserRole.MONITRICE,
  )
  @ApiOperation({ summary: 'Récupérer toutes les annonces' })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.annonceService.findAll(
      paginationQuery,
      user,
      tenantId,
    );
    return {
      message: 'Liste des annonces récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Roles(
    UserRole.ETUDIANT,
    UserRole.PARENT,
    UserRole.ENSEIGNANT,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.COMPTABLE,
    UserRole.MONITRICE,
  )
  @ApiOperation({ summary: 'Récupérer une annonce par son ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.annonceService.findOne(+id, user, tenantId);
    return {
      message: `Annonce #${id} récupérée avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MONITRICE)
  @ApiOperation({ summary: 'Modifier une annonce' })
  async update(
    @Param('id') id: string,
    @Body() updateAnnonceDto: UpdateAnnonceDto,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.annonceService.update(
      +id,
      updateAnnonceDto,
      user,
      tenantId,
    );
    return {
      message: `Annonce #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MONITRICE)
  @ApiOperation({ summary: 'Supprimer une annonce' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.annonceService.remove(+id, user, tenantId);
    return {
      message: `Annonce #${id} supprimée avec succès`,
    };
  }
}
