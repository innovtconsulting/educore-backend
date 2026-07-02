import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFeeGroupDto } from './dto/create-fee-group.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateDepenseDto } from './dto/create-depense.dto';
import { UpdateDepenseDto } from './dto/update-depense.dto';
import { DepenseCategory } from './entities/depense.entity';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // --- Frais ---
  @Post('frais')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({
    summary: 'Créer un frais (parcours/niveaux + génération automatique des factures)',
  })
  async createFeeGroup(
    @Body() dto: CreateFeeGroupDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.createFeeGroup(dto, tenantId);
    return { message: 'Frais créé avec succès', data };
  }

  @Get('frais')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Lister les frais (groupés), filtrable par parcours/niveau' })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  async findAllFeeGroups(
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findAllFeeGroups(
      tenantId,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
    );
    return { message: 'Liste des frais récupérée avec succès', data };
  }

  @Get('frais/:groupeId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({
    summary: "Détail d'un frais : parcours/niveaux avec compteurs payé/total",
  })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  async findFeeGroupDetail(
    @Param('groupeId') groupeId: string,
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findFeeGroupDetail(
      groupeId,
      tenantId,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
    );
    return { message: 'Détail du frais récupéré avec succès', data };
  }

  @Delete('frais/:groupeId')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({
    summary: 'Supprimer un frais (bloqué si des paiements existent déjà)',
  })
  async deleteFeeGroup(
    @Param('groupeId') groupeId: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.financeService.deleteFeeGroup(groupeId, tenantId);
    return { message: 'Frais supprimé avec succès' };
  }

  // --- Étudiants / factures d'un scope (parcours+niveau) ---
  @Get('frais/:fraisId/factures')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({
    summary: "Lister les étudiants et leur situation financière pour un scope de frais",
  })
  async getFacturesByScope(
    @Param('fraisId', ParseIntPipe) fraisId: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.getFacturesByScope(fraisId, tenantId);
    return { message: 'Liste des factures récupérée avec succès', data };
  }

  // --- Facture individuelle ---
  @Get('factures/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE, Role.PARENT, Role.ETUDIANT)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Récupérer une facture avec son historique de paiements' })
  async findOneFacture(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findOneFacture(id, tenantId);
    return { message: `Facture #${id} récupérée avec succès`, data };
  }

  // --- Enregistrer un paiement (tranche) ---
  @Post('factures/:id/paiements')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({
    summary: 'Enregistrer une tranche de paiement (max 3, historique conservé)',
  })
  async createPaiement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.createPaiementForFacture(
      id,
      dto,
      tenantId,
    );
    return { message: 'Paiement enregistré avec succès', data };
  }

  // --- Dépenses ---
  @Post('depenses')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: "Enregistrer une dépense de l'école" })
  async createDepense(
    @Body() dto: CreateDepenseDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.createDepense(dto, tenantId);
    return { message: 'Dépense enregistrée avec succès', data };
  }

  @Get('depenses')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Lister les dépenses, filtrable par période/catégorie' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiQuery({ name: 'category', required: false, enum: DepenseCategory })
  async findAllDepenses(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('category') category?: DepenseCategory,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findAllDepenses(
      tenantId,
      start,
      end,
      category,
    );
    return { message: 'Liste des dépenses récupérée avec succès', data };
  }

  @Patch('depenses/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Modifier une dépense' })
  async updateDepense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepenseDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.updateDepense(id, dto, tenantId);
    return { message: 'Dépense modifiée avec succès', data };
  }

  @Delete('depenses/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Supprimer une dépense' })
  async deleteDepense(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.financeService.deleteDepense(id, tenantId);
    return { message: 'Dépense supprimée avec succès' };
  }

  // --- Dashboard & Rapports ---
  @Get('dashboard')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_REPORT')
  @ApiOperation({ summary: 'Statistiques du tableau de bord financier' })
  async getDashboard(@CurrentEtablissement() tenantId?: number) {
    const data = await this.financeService.getDashboardStats(tenantId);
    return { message: 'Dashboard récupéré avec succès', data };
  }

  @Get('report')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_REPORT')
  @ApiOperation({ summary: 'Générer un rapport financier sur une période, filtrable par parcours/niveau' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  async getReport(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.getFinancialReport(
      start,
      end,
      tenantId,
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
    );
    return { message: 'Rapport financier généré avec succès', data };
  }

  @Get('unpaid')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Lister les factures impayées ou partiellement payées' })
  @ApiQuery({ name: 'classeId', required: false, type: Number })
  @ApiQuery({ name: 'niveauId', required: false, type: Number })
  async getUnpaid(
    @Query('classeId') classeId?: string,
    @Query('niveauId') niveauId?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.getUnpaidFactures(
      classeId ? +classeId : undefined,
      niveauId ? +niveauId : undefined,
      tenantId,
    );
    return { message: 'Liste des impayés récupérée avec succès', data };
  }
}
