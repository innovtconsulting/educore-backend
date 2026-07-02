import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { EtablissementService } from './etablissement.service';
import { CreateEtablissementDto } from './dto/create-etablissement.dto';
import { UpdateEtablissementDto } from './dto/update-etablissement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('etablissement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('etablissement')
export class EtablissementController {
  constructor(private readonly etablissementService: EtablissementService) {}

  @Post()
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({
    summary: 'Créer un établissement',
    description:
      "Permet d'enregistrer un nouvel établissement (FST, ESP, etc.) dans le système.",
  })
  async create(@Body() createEtablissementDto: CreateEtablissementDto) {
    const data = await this.etablissementService.create(createEtablissementDto);
    return {
      message: 'Etablissement créé avec succès',
      data,
    };
  }

  @Get()
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Lister tous les établissements',
    description: 'Récupère la liste complète des établissements enregistrés.',
  })
  async findAll(@CurrentEtablissement() tenantId?: number) {
    const data = await this.etablissementService.findAll(tenantId);
    return data;
  }

  @Get(':id')
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary: 'Récupérer un établissement par ID',
    description:
      "Affiche les informations détaillées d'un établissement spécifique.",
  })
  async findOne(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    const data = await this.etablissementService.findOne(+id, tenantId);
    return {
      message: `Etablissement #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({
    summary: 'Modifier un établissement',
    description: "Met à jour les coordonnées ou le nom d'un établissement.",
  })
  async update(
    @Param('id') id: string,
    @Body() updateEtablissementDto: UpdateEtablissementDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etablissementService.update(
      +id,
      updateEtablissementDto,
      tenantId,
    );
    return {
      message: `Etablissement #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({
    summary: 'Supprimer un établissement',
    description: 'Supprime un établissement du système.',
  })
  async remove(@Param('id') id: string, @CurrentEtablissement() tenantId?: number) {
    await this.etablissementService.remove(+id, tenantId);
    return {
      message: `Etablissement #${id} supprimée avec succès`,
    };
  }

  // Réservé aux ADMIN d'établissement (pas SUPER_ADMIN) : @CurrentEtablissement()
  // renvoie undefined pour un SUPER_ADMIN, ce qu'on rejette explicitement ci-dessous,
  // car le RolesGuard laisse toujours passer SUPER_ADMIN quel que soit @Roles().
  @Post('logo')
  @Roles(Role.ADMIN)
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({
    summary: "Changer le logo de son établissement (réservé à l'admin d'établissement)",
    description: 'PNG uniquement, 2 Mo max, idéalement avec un fond transparent.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const isPng =
          file.mimetype === 'image/png' && /\.png$/i.test(file.originalname);
        if (!isPng) {
          return cb(
            new BadRequestException('Le logo doit être un fichier PNG'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentEtablissement() tenantId?: number,
  ) {
    if (!tenantId) {
      throw new ForbiddenException(
        "Cette action est réservée à l'administrateur de l'établissement",
      );
    }
    if (!file) throw new BadRequestException('Fichier logo manquant');

    const data = await this.etablissementService.updateLogo(tenantId, file.path);
    return { message: 'Logo mis à jour avec succès', data };
  }
}
