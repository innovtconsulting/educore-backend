import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto';

@ApiTags('reporting')
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('supervisor-daily')
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
  @ApiOperation({
    summary: "Récupérer tous les rapports quotidiens soumis (pour l'admin)",
  })
  async getAllDailyReports() {
    const reports = await this.reportingService.getAllDailyReports();
    return {
      message: 'Liste des rapports quotidiens récupérée avec succès',
      data: reports,
    };
  }

  @Get('daily-report/:id')
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
}
