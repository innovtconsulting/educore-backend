import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ParentDashboardService } from './parent-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('parent-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parent-dashboard')
export class ParentDashboardController {
  constructor(
    private readonly parentDashboardService: ParentDashboardService,
  ) {}

  @Get()
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'Obtenir les données du tableau de bord parent' })
  getDashboard(@Request() req: any) {
    return this.parentDashboardService.getDashboardData(req.user);
  }
}
