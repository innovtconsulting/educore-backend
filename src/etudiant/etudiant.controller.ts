/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/await-thenable */
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
} from '@nestjs/common';
import { EtudiantService } from './etudiant.service';
import { CreateEtudiantDto } from './dto/create-etudiant.dto';
import { UpdateEtudiantDto } from './dto/update-etudiant.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('etudiants')
@Controller('etudiants')
export class EtudiantController {
  constructor(private readonly etudiantService: EtudiantService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel étudiant' })
  async create(@Body() createEtudiantDto: CreateEtudiantDto) {
    const data = await this.etudiantService.create(createEtudiantDto);
    return {
      message: 'Étudiant créé avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les étudiants' })
  async findAll() {
    const data = await this.etudiantService.findAll();
    return {
      message: 'Liste des étudiants récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un étudiant par son ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.etudiantService.findOne(+id);
    return {
      message: `Étudiant #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un étudiant' })
  async update(
    @Param('id') id: string,
    @Body() updateEtudiantDto: UpdateEtudiantDto,
  ) {
    const data = await this.etudiantService.update(+id, updateEtudiantDto);
    return {
      message: `Étudiant #${id} mis à jour avec succès`,
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un étudiant' })
  async remove(@Param('id') id: string) {
    await this.etudiantService.remove(+id);
    return {
      message: `Étudiant #${id} supprimé avec succès`,
    };
  }

  @Post(':id/profile-picture')
  @ApiOperation({ summary: "Mettre à jour la photo de profil de l'étudiant" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profiles',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.etudiantService.updateProfilePicture(
      +id,
      file.path,
    );
    return {
      message: 'Photo de profil mise à jour avec succès',
      data,
    };
  }
}
