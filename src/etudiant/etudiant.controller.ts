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
} from '@nestjs/common';
import { EtudiantService } from './etudiant.service';
import { CreateEtudiantDto } from './dto/create-etudiant.dto';
import { UpdateEtudiantDto } from './dto/update-etudiant.dto';
import { ValidateEtudiantDto } from './dto/validate-etudiant.dto';
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
import { EtudiantFilterDto } from './dto/etudiant-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

import {
  CheckImportResultDto,
  RunImportDto,
  ImportReportDto,
} from './dto/import-student.dto';

@ApiTags('etudiants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('etudiants')
export class EtudiantController {
  constructor(private readonly etudiantService: EtudiantService) {}

  @Post()
  @Permissions('STUDENT_CREATE')
  @ApiOperation({ summary: 'Créer un nouvel étudiant' })
  async create(@Body() createEtudiantDto: CreateEtudiantDto) {
    const data = await this.etudiantService.create(createEtudiantDto);
    return {
      message: 'Étudiant créé avec succès',
      data,
    };
  }

  @Get()
  @Permissions('STUDENT_VIEW')
  @ApiOperation({ summary: 'Récupérer tous les étudiants' })
  async findAll(
    @Query() filterDto: EtudiantFilterDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etudiantService.findAll(filterDto, tenantId);
    return {
      message: 'Liste des étudiants récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Permissions('STUDENT_VIEW')
  @ApiOperation({ summary: 'Récupérer un étudiant par son ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etudiantService.findOne(+id, tenantId);
    return {
      message: `Étudiant #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Permissions('STUDENT_EDIT')
  @ApiOperation({
    summary: "Modifier un étudiant (Validation d'inscription inclus)",
  })
  async update(
    @Param('id') id: string,
    @Body() updateEtudiantDto: UpdateEtudiantDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etudiantService.update(
      +id,
      updateEtudiantDto,
      tenantId,
    );
    return {
      message: `Étudiant #${id} mis à jour avec succès`,
      data,
    };
  }

  @Patch(':id/validate')
  @Permissions('STUDENT_VALIDATE')
  @ApiOperation({ summary: "Valider l'inscription d'un étudiant" })
  async validate(
    @Param('id') id: string,
    @Body() validateDto: ValidateEtudiantDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etudiantService.validateEnrollment(
      +id,
      validateDto,
      tenantId,
    );
    return {
      message: `L'inscription de l'étudiant #${id} a été validée avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Permissions('STUDENT_DELETE')
  @ApiOperation({ summary: 'Supprimer un étudiant' })
  async remove(
    @Param('id') id: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.etudiantService.remove(+id, tenantId);
    return {
      message: `Étudiant #${id} supprimé avec succès`,
    };
  }

  @Post(':id/profile-picture')
  @Permissions('STUDENT_EDIT')
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
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException(
              'Seuls les fichiers images sont autorisés (jpg, jpeg, png, gif)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etudiantService.updateProfilePicture(
      +id,
      file.path,
      tenantId,
    );
    return {
      message: 'Photo de profil mise à jour avec succès',
      data,
    };
  }

  @Post('import/validate')
  @Permissions('STUDENT_CREATE')
  @ApiOperation({ summary: 'Valider un fichier Excel avant importation' })
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
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(
    @UploadedFile() file: Express.Multer.File,
    @Query('sheetName') sheetName?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    if (!file) throw new BadRequestException('Fichier Excel manquant');
    const data = await this.etudiantService.validateImport(
      file.buffer,
      sheetName,
      tenantId,
    );
    return {
      message: 'Validation terminée',
      data,
    };
  }

  @Post('import/confirm')
  @Permissions('STUDENT_CREATE')
  @ApiOperation({
    summary: "Confirmer l'importation des étudiants (ancienne version)",
  })
  async confirmImport(
    @Body() confirmDto: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.etudiantService.confirmImport(
      confirmDto.students,
      tenantId,
    );
    return {
      message: 'Importation terminée',
      data,
    };
  }

  @Post('import/v2/check')
  @Permissions('STUDENT_CREATE')
  @ApiOperation({ summary: 'Vérifier un fichier Excel avant importation (v2)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async checkImportV2(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; data: CheckImportResultDto }> {
    if (!file) throw new BadRequestException('Fichier Excel manquant');
    const data = await this.etudiantService.checkImport(file.buffer);
    return {
      message: 'Vérification terminée',
      data,
    };
  }

  @Post('import/v2/run')
  @Permissions('STUDENT_CREATE')
  @ApiOperation({ summary: "Exécuter l'importation des étudiants (v2)" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        data: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async runImportV2(
    @UploadedFile() file: Express.Multer.File,
    @Body('data') dataStr?: string,
  ): Promise<{ message: string; data: ImportReportDto }> {
    if (!file) throw new BadRequestException('Fichier Excel manquant');

    let runDto: RunImportDto = {};
    if (dataStr) {
      try {
        runDto = JSON.parse(dataStr);
      } catch (e) {
        throw new BadRequestException('Données JSON invalides');
      }
    }

    const data = await this.etudiantService.runImport(file.buffer, runDto);
    return {
      message: 'Importation terminée',
      data,
    };
  }
}
