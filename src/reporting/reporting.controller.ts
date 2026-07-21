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
  Request,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('global-stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({ summary: 'Consulter les statistiques globales du système' })
  async getGlobalStats(@Request() req: any, @CurrentEtablissement() tenantId?: number) {
    const data = await this.reportingService.getGlobalStats(tenantId, req.user);
    return {
      message: 'Statistiques globales récupérées avec succès',
      data,
    };
  }

  @Get('supervisor-daily')
  @Roles(Role.MONITRICE, Role.ADMIN)
  @Permissions('REPORT_DAILY_MANAGE')
  @ApiOperation({
    summary:
      'Aperçu du rapport quotidien (absences, retards, sanctions) pour une date donnée',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: "Format YYYY-MM-DD. Par défaut: aujourd'hui.",
  })
  async getDailyReportPreview(
    @Query('date') date?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const data = await this.reportingService.getDailySupervisorReport(
      targetDate,
      tenantId,
    );
    return {
      message: `Aperçu du rapport pour le ${targetDate} récupéré avec succès`,
      data,
    };
  }

  @Post('submit-daily')
  @Roles(Role.MONITRICE, Role.ADMIN)
  @Permissions('REPORT_DAILY_MANAGE')
  @ApiOperation({ summary: 'Soumettre le rapport quotidien du monitrice' })
  @ApiResponse({ status: 201, description: 'Rapport soumis avec succès' })
  async submitDailyReport(
    @Body() dto: SubmitDailyReportDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const report = await this.reportingService.submitDailyReport(dto, tenantId);
    return {
      message: 'Rapport quotidien soumis avec succès',
      data: report,
    };
  }

  @Get('daily-reports')
  @Roles(Role.MONITRICE, Role.ADMIN)
  @Permissions('REPORT_DAILY_MANAGE')
  @ApiOperation({
    summary: "Récupérer tous les rapports quotidiens soumis (pour l'admin)",
  })
  async getAllDailyReports(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const reports = await this.reportingService.getAllDailyReports(
      paginationQuery,
      tenantId,
    );
    return {
      message: 'Liste des rapports quotidiens récupérée avec succès',
      data: reports,
    };
  }

  @Get('daily-report/:id')
  @Roles(Role.MONITRICE, Role.ADMIN)
  @Permissions('REPORT_DAILY_MANAGE')
  @ApiOperation({
    summary: 'Récupérer un rapport quotidien spécifique par son ID',
  })
  async getDailyReportById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const report = await this.reportingService.getDailyReportById(id, tenantId);
    return {
      message: 'Rapport quotidien récupéré avec succès',
      data: report,
    };
  }

  @Get('daily-report/:id/pdf')
  @Roles(Role.MONITRICE, Role.ADMIN)
  @Permissions('REPORT_DAILY_MANAGE')
  @ApiOperation({ summary: "Récupérer le PDF d'un rapport quotidien" })
  async getDailyReportPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const report = await this.reportingService.getDailyReportById(id, tenantId);
    if (!report.pdfUrl) {
      throw new NotFoundException(
        "Le PDF de ce rapport n'a pas encore été généré",
      );
    }
    return {
      message: 'Lien du PDF récupéré avec succès',
      data: { pdfUrl: `/${report.pdfUrl}` },
    };
  }
}
