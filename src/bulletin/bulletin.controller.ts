import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import { BulletinService } from './bulletin.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRoles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { Response } from 'express';
import * as path from 'path';

@ApiTags('bulletins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bulletins')
export class BulletinController {
  constructor(private readonly bulletinService: BulletinService) {}

  @Get('etudiant/:etudiantId/semestre/:semestreId')
  @UserRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ENSEIGNANT,
    UserRole.SURVEILLANT,
    UserRole.PARENT,
    UserRole.ETUDIANT,
  )
  @ApiOperation({
    summary:
      "Générer le bulletin de notes d'un étudiant pour un semestre (JSON)",
  })
  async getBulletin(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Param('semestreId', ParseIntPipe) semestreId: number,
  ) {
    const data = await this.bulletinService.getStudentBulletin(
      etudiantId,
      semestreId,
    );
    return {
      message: 'Bulletin de notes généré avec succès',
      data,
    };
  }

  @Get('etudiant/:etudiantId/semestre/:semestreId/pdf')
  @UserRoles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ENSEIGNANT,
    UserRole.SURVEILLANT,
    UserRole.PARENT,
    UserRole.ETUDIANT,
  )
  @ApiOperation({
    summary:
      "Générer le bulletin de notes d'un étudiant pour un semestre (PDF)",
  })
  async getBulletinPdf(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Param('semestreId', ParseIntPipe) semestreId: number,
    @Res() res: Response,
  ) {
    const relativePath = await this.bulletinService.getStudentBulletinPdf(
      etudiantId,
      semestreId,
    );
    const absolutePath = path.join(process.cwd(), relativePath);

    res.download(absolutePath);
  }
}
