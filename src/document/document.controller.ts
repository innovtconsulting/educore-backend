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
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Uploader un nouveau document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: ['Administratif', 'Pédagogique', 'Règlement', 'Autre'] },
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
  ) {
    if (!file) {
      throw new BadRequestException('Le fichier est obligatoire');
    }
    const data = await this.documentService.create(createDocumentDto, file);
    return {
      message: 'Document uploadé avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les documents' })
  async findAll() {
    const data = await this.documentService.findAll();
    return {
      message: 'Liste des documents récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un document par son ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.documentService.findOne(+id);
    return {
      message: `Document #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier les métadonnées d\'un document' })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    const data = await this.documentService.update(+id, updateDocumentDto);
    return {
      message: `Document #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un document et son fichier physique' })
  async remove(@Param('id') id: string) {
    await this.documentService.remove(+id);
    return {
      message: `Document #${id} supprimé avec succès`,
    };
  }
}
