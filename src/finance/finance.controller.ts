import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFraisDto } from './dto/create-frais.dto';
import { CreateFactureDto } from './dto/create-facture.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // --- Frais ---
  @Post('frais')
  @ApiOperation({ summary: 'Créer un nouveau type de frais' })
  async createFrais(@Body() dto: CreateFraisDto) {
    const data = await this.financeService.createFrais(dto);
    return { message: 'Frais créé avec succès', data };
  }

  @Get('frais')
  @ApiOperation({ summary: 'Récupérer tous les frais configurés' })
  async findAllFrais() {
    const data = await this.financeService.findAllFrais();
    return { message: 'Liste des frais récupérée avec succès', data };
  }

  // --- Factures ---
  @Post('factures')
  @ApiOperation({ summary: 'Émettre une nouvelle facture' })
  async createFacture(@Body() dto: CreateFactureDto) {
    const data = await this.financeService.createFacture(dto);
    return { message: 'Facture émise avec succès', data };
  }

  @Get('factures')
  @ApiOperation({ summary: 'Récupérer toutes les factures' })
  async findAllFactures() {
    const data = await this.financeService.findAllFactures();
    return { message: 'Liste des factures récupérée avec succès', data };
  }

  @Get('factures/:id')
  @ApiOperation({ summary: 'Récupérer une facture par ID' })
  async findOneFacture(@Param('id', ParseIntPipe) id: number) {
    const data = await this.financeService.findOneFacture(id);
    return { message: `Facture #${id} récupérée avec succès`, data };
  }

  // --- Paiements ---
  @Post('paiements')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  async createPaiement(@Body() dto: CreatePaiementDto) {
    const data = await this.financeService.createPaiement(dto);
    return { message: 'Paiement enregistré avec succès', data };
  }

  @Get('paiements')
  @ApiOperation({ summary: 'Récupérer tous les paiements' })
  async findAllPaiements() {
    const data = await this.financeService.findAllPaiements();
    return { message: 'Liste des paiements récupérée avec succès', data };
  }

  // --- Dashboard & Reports ---
  @Get('dashboard')
  @ApiOperation({ summary: 'Statistiques du tableau de bord financier' })
  async getDashboard() {
    const data = await this.financeService.getDashboardStats();
    return { message: 'Dashboard récupéré avec succès', data };
  }

  @Get('report')
  @ApiOperation({ summary: 'Générer un rapport financier' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  async getReport(@Query('start') start?: string, @Query('end') end?: string) {
    const data = await this.financeService.getFinancialReport(start, end);
    return { message: 'Rapport financier généré avec succès', data };
  }
}
