import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  UseGuards,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { DocumentCategory } from './entities/document.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.ENSEIGNANT, Role.SUPER_ADMIN)
  @Permissions('DOCUMENT_MANAGE', 'ACADEMIC_MANAGE')
  @ApiOperation({
    summary: 'Uploader un nouveau document',
    description:
      "Permet de stocker un fichier physique (PDF, Image, etc.) et d'y associer des métadonnées (titre, catégorie).",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier à uploader (max 10MB)',
        },
        title: { type: 'string', description: 'Titre du document' },
        description: { type: 'string', description: 'Description optionnelle' },
        category: {
          type: 'string',
          enum: ['Administratif', 'Pédagogique', 'Règlement', 'Autre'],
          description: 'Catégorie du document',
        },
        classeId: { type: 'number', description: 'Parcours concerné' },
        niveauId: { type: 'number', description: 'Niveau concerné' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('Le fichier est obligatoire');
    }
    const data = await this.documentService.create(
      createDocumentDto,
      file,
      tenantId,
    );
    return {
      message: 'Document uploadé avec succès',
      data,
    };
  }

  @Post('upload/rendu')
  @Roles(Role.ETUDIANT)
  @ApiOperation({ summary: 'Uploader un rendu de devoir (étudiant)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadStudentRendu(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('Le fichier est obligatoire');
    }
    const data = await this.documentService.create(
      {
        title: title || file.originalname,
        description: description || 'Rendu de devoir',
        category: DocumentCategory.AUTRE,
      },
      file,
      tenantId,
    );
    return {
      message: 'Rendu uploadé avec succès',
      data,
    };
  }

  @Get()
  @Roles(
    Role.ETUDIANT,
    Role.PARENT,
    Role.ENSEIGNANT,
    Role.ADMIN,
    Role.SURVEILLANT,
    Role.COMPTABLE,
  )
  @ApiOperation({
    summary: 'Récupérer tous les documents',
    description:
      'Liste tous les documents enregistrés dans la GED (Gestion Électronique de Documents).',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @Query('category') category?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const paginationQuery: PaginationQueryDto = {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    };
    const data = await this.documentService.findAll(
      paginationQuery,
      tenantId,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
      category,
    );
    return {
      message: 'Liste des documents récupérée avec succès',
      data,
    };
  }

  @Get(':id/download')
  @Roles(
    Role.ETUDIANT,
    Role.PARENT,
    Role.ENSEIGNANT,
    Role.ADMIN,
    Role.SURVEILLANT,
    Role.COMPTABLE,
  )
  @ApiOperation({ summary: 'Télécharger le fichier physique' })
  async download(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const doc = await this.documentService.findOne(+id, tenantId);
    const filePath = join(process.cwd(), doc.filePath);
    const stream = createReadStream(filePath);
    return new StreamableFile(stream, {
      disposition: `attachment; filename="${doc.originalName || doc.title}"`,
      type: doc.mimeType || 'application/octet-stream',
    });
  }

  @Get(':id')
  @Roles(
    Role.ETUDIANT,
    Role.PARENT,
    Role.ENSEIGNANT,
    Role.ADMIN,
    Role.SURVEILLANT,
    Role.COMPTABLE,
  )
  @ApiOperation({
    summary: 'Récupérer un document par son ID',
    description:
      "Affiche les informations détaillées d'un document et son lien de téléchargement.",
  })
  async findOne(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.documentService.findOne(+id, tenantId);
    return {
      message: `Document #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Permissions('DOCUMENT_MANAGE')
  @ApiOperation({
    summary: "Modifier les métadonnées d'un document",
    description:
      'Permet de changer le titre, la description ou la catégorie sans modifier le fichier physique.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.documentService.update(
      +id,
      updateDocumentDto,
      tenantId,
    );
    return {
      message: `Document #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Permissions('DOCUMENT_MANAGE')
  @ApiOperation({
    summary: 'Supprimer un document',
    description:
      "Supprime l'entrée en base de données ET le fichier physique sur le serveur.",
  })
  async remove(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.documentService.remove(+id, tenantId);
    return {
      message: `Document #${id} supprimé avec succès`,
    };
  }
}
