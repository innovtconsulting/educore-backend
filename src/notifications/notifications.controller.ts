import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
}
