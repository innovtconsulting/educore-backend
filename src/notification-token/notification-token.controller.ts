import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NotificationTokenService } from './notification-token.service';
import { CreateNotificationTokenDto } from './dto/create-notification-token.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('notification-tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notification-tokens')
export class NotificationTokenController {
  constructor(
    private readonly notificationTokenService: NotificationTokenService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Save a notification token for current user' })
  async create(
    @Body() createNotificationTokenDto: CreateNotificationTokenDto,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.notificationTokenService.create(
      createNotificationTokenDto,
      user,
      tenantId,
    );
    return {
      message: 'Token de notification enregistré avec succès',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all notification tokens for current user' })
  async findAll(
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.notificationTokenService.findAllForUser(
      user.id,
      tenantId,
    );
    return {
      message: 'Tokens récupérés avec succès',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification token' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.notificationTokenService.remove(+id, user, tenantId);
    return {
      message: 'Token supprimé avec succès',
    };
  }
}
