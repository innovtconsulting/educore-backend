import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get('scolarity/:etudiantId')
  @Roles(Role.ETUDIANT, Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions('STUDENT_VIEW')
  @ApiOperation({
    summary:
      "Récupérer les données nécessaires à un certificat de scolarité (la génération du PDF se fait côté navigateur)",
  })
  @ApiQuery({
    name: 'anneeId',
    required: false,
    description: "ID de l'année universitaire. Par défaut: année active.",
  })
  async getScolarityCertificate(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Req() req: any,
    @Query('anneeId') anneeId?: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.certificateService.getScolarityCertificateData(
      etudiantId,
      anneeId,
      req.user,
      tenantId,
    );
    return {
      message: 'Données du certificat de scolarité récupérées avec succès',
      data,
    };
  }

  @Get('success/:etudiantId')
  @Roles(Role.ETUDIANT, Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions('ACADEMIC_VIEW')
  @ApiOperation({
    summary:
      "Récupérer les données nécessaires à une attestation de réussite (la génération du PDF se fait côté navigateur)",
  })
  @ApiQuery({
    name: 'anneeId',
    required: false,
    description: "ID de l'année universitaire. Par défaut: année active.",
  })
  async getSuccessAttestation(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Req() req: any,
    @Query('anneeId') anneeId?: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.certificateService.getSuccessAttestationData(
      etudiantId,
      anneeId,
      req.user,
      tenantId,
    );
    return {
      message: "Données de l'attestation de réussite récupérées avec succès",
      data,
    };
  }

  @Get('history')
  @Permissions('STUDENT_VIEW')
  @ApiOperation({ summary: "Consulter l'historique des documents générés" })
  @ApiQuery({
    name: 'etudiantId',
    required: false,
    description: 'Filtrer par étudiant',
  })
  async getHistory(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('etudiantId') etudiantId?: number,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.certificateService.getHistory(
      paginationQuery,
      etudiantId,
      tenantId,
    );
    return {
      message: 'Historique des documents récupéré avec succès',
      data,
    };
  }

  @Get('my-history')
  @Roles(Role.ETUDIANT)
  @ApiOperation({ summary: 'Consulter mon historique de documents (Étudiant)' })
  async getMyHistory(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() req: any,
    @CurrentEtablissement() tenantId?: number,
  ) {
    const data = await this.certificateService.getHistory(
      paginationQuery,
      req.user.etudiantId,
      tenantId,
    );
    return {
      message: 'Mon historique de documents récupéré avec succès',
      data,
    };
  }
}
