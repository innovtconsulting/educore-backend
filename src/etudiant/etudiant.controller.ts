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
import { Role } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('etudiants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('etudiants')
export class EtudiantController {
  constructor(private readonly etudiantService: EtudiantService) {}

  @Public()
  @Post('pre-inscription')
  @ApiOperation({ summary: "Pré-inscription d'un étudiant (Public)" })
  async preRegister(@Body() createEtudiantDto: CreateEtudiantDto) {
    const data = await this.etudiantService.preRegister(createEtudiantDto);
    return {
      message:
        'Votre demande de pré-inscription a été enregistrée avec succès. Un administrateur la validera prochainement.',
      data,
    };
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Créer un nouvel étudiant' })
  async create(@Body() createEtudiantDto: CreateEtudiantDto) {
    const data = await this.etudiantService.create(createEtudiantDto);
    return {
      message: 'Étudiant créé avec succès',
      data,
    };
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer tous les étudiants' })
  async findAll(@Query() filterDto: EtudiantFilterDto) {
    const data = await this.etudiantService.findAll(filterDto);
    return {
      message: 'Liste des étudiants récupérée avec succès',
      data,
    };
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer un étudiant par son ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.etudiantService.findOne(+id);
    return {
      message: `Étudiant #${id} récupéré avec succès`,
      data,
    };
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: "Modifier un étudiant (Validation d'inscription inclus)",
  })
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

  @Patch(':id/validate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: "Valider l'inscription d'un étudiant" })
  async validate(
    @Param('id') id: string,
    @Body() validateDto: ValidateEtudiantDto,
  ) {
    const data = await this.etudiantService.validateEnrollment(
      +id,
      validateDto,
    );
    return {
      message: `L'inscription de l'étudiant #${id} a été validée avec succès`,
      data,
    };
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un étudiant' })
  async remove(@Param('id') id: string) {
    await this.etudiantService.remove(+id);
    return {
      message: `Étudiant #${id} supprimé avec succès`,
    };
  }

  @Post(':id/profile-picture')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
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
