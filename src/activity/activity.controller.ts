import { Controller, Get, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('me')
  @Roles(Role.ETUDIANT, Role.PARENT)
  @ApiOperation({ summary: "Fil d'activité de l'étudiant connecté (ou d'un enfant pour le parent)" })
  @ApiQuery({ name: 'etudiantId', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyActivities(
    @CurrentUser() user: any,
    @Query('etudiantId') etudiantIdParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    let etudiantId: number;

    if (user.role === Role.ETUDIANT) {
      if (!user.etudiantId) {
        throw new ForbiddenException('Profil étudiant introuvable');
      }
      etudiantId = user.etudiantId;
    } else if (user.role === Role.PARENT) {
      if (!etudiantIdParam) {
        throw new ForbiddenException('Veuillez spécifier un étudiant (etudiantId)');
      }
      etudiantId = parseInt(etudiantIdParam, 10);
    } else {
      throw new ForbiddenException('Accès non autorisé');
    }

    const data = await this.activityService.getActivities(etudiantId, limit);
    return { message: 'Activités récupérées avec succès', data };
  }
}
