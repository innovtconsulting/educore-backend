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
  Res,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFraisDto } from './dto/create-frais.dto';
import { CreateFactureDto } from './dto/create-facture.dto';
import { CreatePaiementDto } from './dto/create-paiement.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { Response } from 'express';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
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
  @ApiOperation({ summary: 'Créer un nouveau type de frais' })
  async createFrais(
    @Body() dto: CreateFraisDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.createFrais(dto, tenantId);
    return { message: 'Frais créé avec succès', data };
  }

  @Get('frais')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Récupérer tous les frais configurés' })
  async findAllFrais(@CurrentEtablissement() tenantId?: number) {
    const data = await this.financeService.findAllFrais(tenantId);
    return { message: 'Liste des frais récupérée avec succès', data };
  }

  @Patch('frais/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Modifier un frais' })
  async updateFrais(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFraisDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.updateFrais(id, dto, tenantId);
    return { message: 'Frais modifié avec succès', data };
  }

  @Delete('frais/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Supprimer un frais' })
  async deleteFrais(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.financeService.deleteFrais(id, tenantId);
    return { message: 'Frais supprimé avec succès' };
  }

  // --- Factures ---
  @Post('factures')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Émettre une nouvelle facture' })
  async createFacture(
    @Body() dto: CreateFactureDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.createFacture(dto, tenantId);
    return { message: 'Facture émise avec succès', data };
  }

  @Get('factures')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Récupérer toutes les factures' })
  async findAllFactures(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findAllFactures(
      paginationQuery,
      tenantId,
    );
    return { message: 'Liste des factures récupérée avec succès', data };
  }

  @Get('factures/:id')
  @Roles(Role.PARENT, Role.ETUDIANT)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Récupérer une facture par ID' })
  async findOneFacture(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findOneFacture(id, tenantId);
    return { message: `Facture #${id} récupérée avec succès`, data };
  }

  @Patch('factures/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Modifier une facture' })
  async updateFacture(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFactureDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.updateFacture(id, dto, tenantId);
    return { message: 'Facture modifiée avec succès', data };
  }

  @Delete('factures/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Supprimer une facture' })
  async deleteFacture(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.financeService.deleteFacture(id, tenantId);
    return { message: 'Facture supprimée avec succès' };
  }

  // --- Paiements ---
  @Post('paiements')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({
    summary: 'Enregistrer un paiement',
    description:
      'Enregistre un règlement pour un étudiant. Cette action génère automatiquement un reçu PDF stocké sur le serveur et met à jour le statut de la facture associée.',
  })
  async createPaiement(
    @Body() dto: CreatePaiementDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.createPaiement(dto, tenantId);
    return { message: 'Paiement enregistré avec succès', data };
  }

  @Get('paiements')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Récupérer tous les paiements' })
  async findAllPaiements(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.findAllPaiements(
      paginationQuery,
      tenantId,
    );
    return { message: 'Liste des paiements récupérée avec succès', data };
  }

  @Patch('paiements/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Modifier un paiement' })
  async updatePaiement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaiementDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.updatePaiement(id, dto, tenantId);
    return { message: 'Paiement modifié avec succès', data };
  }

  @Delete('paiements/:id')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: 'Supprimer un paiement' })
  async deletePaiement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    await this.financeService.deletePaiement(id, tenantId);
    return { message: 'Paiement supprimé avec succès' };
  }

  @Post('paiements/:id/generate-recu')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: "Générer manuellement le reçu d'un paiement" })
  async manualReceipt(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.generateManualReceipt(id, tenantId);
    return { message: 'Reçu généré avec succès', data };
  }

  @Post('factures/:id/generate-quittance')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiOperation({ summary: "Générer manuellement la quittance d'une facture" })
  async manualQuittance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.generateManualQuittance(
      id,
      tenantId,
    );
    return { message: 'Quittance générée avec succès', data };
  }

  // --- Documents (Reçus & Quittances) ---
  @Get('paiements/:id/recu')
  @Roles(
    Role.PARENT,
    Role.ETUDIANT,
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.COMPTABLE,
  )
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Télécharger le reçu de paiement' })
  async downloadRecu(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const paiement = await this.financeService.paiementRepository.findOneBy({
      id,
    });
    if (!paiement || !paiement.recuPath)
      throw new NotFoundException('Reçu introuvable');

    const filePath = join(process.cwd(), paiement.recuPath);
    if (!existsSync(filePath))
      throw new NotFoundException('Fichier physique introuvable');

    return res.download(filePath);
  }

  @Get('factures/:id/quittance')
  @Roles(
    Role.PARENT,
    Role.ETUDIANT,
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.COMPTABLE,
  )
  @Permissions('FINANCE_VIEW')
  @ApiOperation({ summary: 'Télécharger la quittance de solde' })
  async downloadQuittance(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const facture = await this.financeService.factureRepository.findOneBy({
      id,
    });
    if (!facture || !facture.quittancePath)
      throw new NotFoundException('Quittance introuvable');

    const filePath = join(process.cwd(), facture.quittancePath);
    if (!existsSync(filePath))
      throw new NotFoundException('Fichier physique introuvable');

    return res.download(filePath);
  }

  @Post('factures/:id/quittance/upload')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/receipts',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `manual-quittance-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  @ApiOperation({
    summary: 'Uploader manuellement une quittance pour une facture',
  })
  async uploadQuittance(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const facture = await this.financeService.factureRepository.findOneBy({
      id,
    });
    if (!facture) throw new NotFoundException('Facture introuvable');

    facture.quittancePath = `uploads/receipts/${file.filename}`;
    const data = await this.financeService.factureRepository.save(facture);
    return { message: 'Quittance uploadée avec succès', data };
  }

  @Post('paiements/:id/recu/upload')
  @Roles(Role.COMPTABLE)
  @Permissions('FINANCE_MANAGE')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/receipts',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `manual-recu-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiOperation({ summary: 'Uploader manuellement un reçu pour un paiement' })
  async uploadRecuFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    const paiement = await this.financeService.paiementRepository.findOneBy({
      id,
    });
    if (!paiement) throw new NotFoundException('Paiement introuvable');

    paiement.recuPath = `uploads/receipts/${file.filename}`;
    const data = await this.financeService.paiementRepository.save(paiement);
    return { message: 'Reçu uploadé avec succès', data };
  }

  // --- Dashboard & Reports ---
  @Get('dashboard')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_REPORT')
  @ApiOperation({
    summary: 'Statistiques du tableau de bord financier',
    description:
      "Récupère les métriques globales (encaissé, facturé, impayés) ainsi qu'une ventilation détaillée par niveau d'étude.",
  })
  async getDashboard(@CurrentEtablissement() tenantId?: number) {
    const data = await this.financeService.getDashboardStats(tenantId);
    return { message: 'Dashboard récupéré avec succès', data };
  }

  @Get('report')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_REPORT')
  @ApiOperation({
    summary: 'Générer un rapport financier',
    description:
      'Génère un récapitulatif des paiements sur une période donnée.',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Date de début (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'Date de fin (YYYY-MM-DD)',
  })
  async getReport(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.financeService.getFinancialReport(
      start,
      end,
      tenantId,
    );
    return { message: 'Rapport financier généré avec succès', data };
  }

  @Get('unpaid')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.COMPTABLE)
  @Permissions('FINANCE_VIEW')
  @ApiOperation({
    summary: 'Lister les factures impayées ou partiellement payées',
    description:
      'Récupère la liste des étudiants ayant des dettes, avec possibilité de filtrer par classe ou par niveau.',
  })
  @ApiQuery({
    name: 'classeId',
    required: false,
    type: Number,
    description: 'ID de la classe',
  })
  @ApiQuery({
    name: 'niveauId',
    required: false,
    type: Number,
    description: 'ID du niveau',
  })
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
