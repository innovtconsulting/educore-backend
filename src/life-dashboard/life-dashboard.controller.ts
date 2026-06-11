import { Controller, Get, UseGuards } from '@nestjs/common';
import { LifeDashboardService } from './life-dashboard.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('life-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('life-dashboard')
export class LifeDashboardController {
  constructor(private readonly dashboardService: LifeDashboardService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer les statistiques de vie scolaire (Surveillant)' })
  async getDashboard() {
    const data = await this.dashboardService.getDashboardStats();
    return {
      message: 'Tableau de bord vie scolaire récupéré avec succès',
      data,
    };
  }
}
