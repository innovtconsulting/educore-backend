import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { BulletinService } from './bulletin.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('bulletins')
@Controller('bulletins')
export class BulletinController {
  constructor(private readonly bulletinService: BulletinService) {}

  @Get('etudiant/:etudiantId/semestre/:semestreId')
  @ApiOperation({ summary: 'Générer le bulletin de notes d\'un étudiant pour un semestre' })
  async getBulletin(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Param('semestreId', ParseIntPipe) semestreId: number,
  ) {
    const data = await this.bulletinService.getStudentBulletin(etudiantId, semestreId);
    return {
      message: 'Bulletin de notes généré avec succès',
      data,
    };
  }
}
