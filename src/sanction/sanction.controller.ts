import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SanctionService } from './sanction.service';
import { CreateSanctionDto } from './dto/create-sanction.dto';
import { UpdateSanctionDto } from './dto/update-sanction.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('sanctions')
@Controller('sanctions')
export class SanctionController {
  constructor(private readonly sanctionService: SanctionService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle sanction' })
  async create(@Body() createSanctionDto: CreateSanctionDto) {
    const data = await this.sanctionService.create(createSanctionDto);
    return {
      message: 'Sanction créée avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les sanctions' })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    const data = await this.sanctionService.findAll(paginationQuery);
    return {
      message: 'Liste des sanctions récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une sanction par son ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.sanctionService.findOne(id);
    return {
      message: `Sanction #${id} récupérée avec succès`,
      data,
    };
  }

  @Get('etudiant/:etudiantId')
  @ApiOperation({ summary: "Récupérer toutes les sanctions d'un étudiant" })
  async findByEtudiant(@Param('etudiantId', ParseIntPipe) etudiantId: number) {
    const data = await this.sanctionService.findByEtudiant(etudiantId);
    return {
      message: `Sanctions de l'étudiant #${etudiantId} récupérées avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une sanction' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSanctionDto: UpdateSanctionDto,
  ) {
    const data = await this.sanctionService.update(id, updateSanctionDto);
    return {
      message: `Sanction #${id} mise à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une sanction' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sanctionService.remove(id);
    return {
      message: `Sanction #${id} supprimée avec succès`,
    };
  }
}
