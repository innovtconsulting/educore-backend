import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User, Role } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.ETUDIANT,
    Role.PARENT,
    Role.COMPTABLE,
    Role.SURVEILLANT,
  )
  @ApiOperation({ summary: "Obtenir mon propre profil d'utilisateur" })
  getMe(@Request() req: any) {
    return this.userService.findOne(req.user.id);
  }

  @Patch('me')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.ETUDIANT,
    Role.PARENT,
    Role.COMPTABLE,
    Role.SURVEILLANT,
  )
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  updateMe(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('me/profile-picture')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.ENSEIGNANT,
    Role.ETUDIANT,
    Role.PARENT,
    Role.COMPTABLE,
    Role.SURVEILLANT,
  )
  @ApiOperation({ summary: 'Mettre à jour ma photo de profil' })
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
  async uploadProfilePicture(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.userService.updateProfilePicture(
      req.user.id,
      file.path,
    );
    return {
      message: 'Photo de profil mise à jour avec succès',
      data,
    };
  }

  @Post()
  @Permissions('USER_MANAGE')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  create(@Body() userData: Partial<User>) {
    return this.userService.create(userData);
  }

  @Get()
  @Permissions('USER_MANAGE')
  @ApiOperation({ summary: 'Lister tous les utilisateurs' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @Permissions('USER_MANAGE')
  @ApiOperation({ summary: 'Obtenir un utilisateur par son ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Permissions('USER_MANAGE')
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<User>,
  ) {
    return this.userService.update(id, updateData);
  }

  @Delete(':id')
  @Permissions('USER_MANAGE')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
