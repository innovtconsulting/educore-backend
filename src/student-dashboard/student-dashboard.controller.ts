import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { StudentDashboardService } from './student-dashboard.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('student-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student-dashboard')
export class StudentDashboardController {
  constructor(private readonly dashboardService: StudentDashboardService) {}

  @Get()
  @Roles(Role.ETUDIANT)
  @ApiOperation({
    summary: 'Récupérer les données du tableau de bord étudiant',
  })
  async getDashboard(@Request() req: any) {
    const data = await this.dashboardService.getDashboardData(req.user);
    return {
      message: 'Données du tableau de bord récupérées avec succès',
      data,
    };
  }
}
