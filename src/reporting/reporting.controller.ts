import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('global-stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Consulter les statistiques globales du système' })
  async getGlobalStats() {
    const data = await this.reportingService.getGlobalStats();
    return {
      message: 'Statistiques globales récupérées avec succès',
      data,
    };
  }

  @Get('supervisor-daily')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({
    summary:
      'Aperçu du rapport quotidien (absences, retards, sanctions) pour une date donnée',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: "Format YYYY-MM-DD. Par défaut: aujourd'hui.",
  })
  async getDailyReportPreview(@Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const data =
      await this.reportingService.getDailySupervisorReport(targetDate);
    return {
      message: `Aperçu du rapport pour le ${targetDate} récupéré avec succès`,
      data,
    };
  }

  @Post('submit-daily')
  @Roles(Role.SURVEILLANT, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soumettre le rapport quotidien du surveillant' })
  @ApiResponse({ status: 201, description: 'Rapport soumis avec succès' })
  async submitDailyReport(@Body() dto: SubmitDailyReportDto) {
    const report = await this.reportingService.submitDailyReport(dto);
    return {
      message: 'Rapport quotidien soumis avec succès',
      data: report,
    };
  }

  @Get('daily-reports')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: "Récupérer tous les rapports quotidiens soumis (pour l'admin)",
  })
  async getAllDailyReports(@Query() paginationQuery: PaginationQueryDto) {
    const reports = await this.reportingService.getAllDailyReports(paginationQuery);
    return {
      message: 'Liste des rapports quotidiens récupérée avec succès',
      data: reports,
    };
  }

  @Get('daily-report/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Récupérer un rapport quotidien spécifique par son ID',
  })
  async getDailyReportById(@Param('id', ParseIntPipe) id: number) {
    const report = await this.reportingService.getDailyReportById(id);
    return {
      message: 'Rapport quotidien récupéré avec succès',
      data: report,
    };
  }

  @Get('daily-report/:id/pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SURVEILLANT)
  @ApiOperation({ summary: 'Récupérer le PDF d\'un rapport quotidien' })
  async getDailyReportPdf(@Param('id', ParseIntPipe) id: number) {
    const report = await this.reportingService.getDailyReportById(id);
    if (!report.pdfUrl) {
      throw new NotFoundException('Le PDF de ce rapport n\'a pas encore été généré');
    }
    return {
      message: 'Lien du PDF récupéré avec succès',
      data: { pdfUrl: `/${report.pdfUrl}` },
    };
  }
}
