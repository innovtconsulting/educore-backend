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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

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
  async findAllFactures(@Query() paginationQuery: PaginationQueryDto) {
    const data = await this.financeService.findAllFactures(paginationQuery);
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
  @ApiOperation({ 
    summary: 'Enregistrer un paiement',
    description: 'Enregistre un règlement pour un étudiant. Cette action génère automatiquement un reçu PDF stocké sur le serveur et met à jour le statut de la facture associée.'
  })
  async createPaiement(@Body() dto: CreatePaiementDto) {
    const data = await this.financeService.createPaiement(dto);
    return { message: 'Paiement enregistré avec succès', data };
  }

  @Get('paiements')
  @ApiOperation({ summary: 'Récupérer tous les paiements' })
  async findAllPaiements(@Query() paginationQuery: PaginationQueryDto) {
    const data = await this.financeService.findAllPaiements(paginationQuery);
    return { message: 'Liste des paiements récupérée avec succès', data };
  }

  // --- Dashboard & Reports ---
  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Statistiques du tableau de bord financier',
    description: 'Récupère les métriques globales (encaissé, facturé, impayés) ainsi qu\'une ventilation détaillée par niveau d\'étude.'
  })
  async getDashboard() {
    const data = await this.financeService.getDashboardStats();
    return { message: 'Dashboard récupéré avec succès', data };
  }

  @Get('report')
  @ApiOperation({ 
    summary: 'Générer un rapport financier',
    description: 'Génère un récapitulatif des paiements sur une période donnée.'
  })
  @ApiQuery({ name: 'start', required: false, description: 'Date de début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end', required: false, description: 'Date de fin (YYYY-MM-DD)' })
  async getReport(@Query('start') start?: string, @Query('end') end?: string) {
    const data = await this.financeService.getFinancialReport(start, end);
    return { message: 'Rapport financier généré avec succès', data };
  }

  @Get('unpaid')
  @ApiOperation({ 
    summary: 'Lister les factures impayées ou partiellement payées',
    description: 'Récupère la liste des étudiants ayant des dettes, avec possibilité de filtrer par classe ou par niveau.'
  })
  @ApiQuery({ name: 'classeId', required: false, type: Number, description: 'ID de la classe' })
  @ApiQuery({ name: 'niveauId', required: false, type: Number, description: 'ID du niveau' })
  async getUnpaid(
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
  ) {
    const data = await this.financeService.getUnpaidFactures(
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
    );
    return { message: 'Liste des impayés récupérée avec succès', data };
  }
}
