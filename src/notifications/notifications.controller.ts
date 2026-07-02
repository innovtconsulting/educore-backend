import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: "Récupérer les notifications de l'utilisateur connecté",
  })
  async findMine(@Request() req: any) {
    const data = await this.notificationsService.findForUser(req.user);
    return { message: 'Notifications récupérées avec succès', data };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.notificationsService.markAsRead(id, req.user);
    return { message: 'Notification marquée comme lue', data };
  }

  @Post('ecolage-retard/check')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.COMPTABLE,
    Role.ETUDIANT,
    Role.PARENT,
  )
  @ApiOperation({
    summary: "Détecter les retards d'écolage et créer les notifications",
  })
  async checkOverdueTuition(@Request() req: any) {
    const data =
      await this.notificationsService.checkOverdueTuitionNotifications(
        req.user,
      );
    return {
      message: "Vérification des retards d'écolage terminée",
      data,
    };
  }

  @Post('ecolage-retard/test-student')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: "Créer l'étudiant de test et une facture d'écolage en retard",
  })
  async prepareOverdueTuitionTestStudent(@Request() req: any) {
    const data =
      await this.notificationsService.prepareOverdueTuitionTestStudent(
        req.user,
      );
    return {
      message: 'Étudiant de test écolage en retard prêt',
      data,
    };
  }
}
