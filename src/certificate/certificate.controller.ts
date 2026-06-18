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
import { UserRoles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Get('scolarity/:etudiantId')
  @UserRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ETUDIANT)
  @ApiOperation({
    summary: 'Générer un certificat de scolarité pour un étudiant',
  })
  async getScolarityCertificate(
    @Param('etudiantId', ParseIntPipe) etudiantId: number,
    @Req() req: any,
  ) {
    const data = await this.certificateService.getScolarityCertificate(
      etudiantId,
      req.user,
    );
    return {
      message: 'Certificat de scolarité généré avec succès',
      data,
    };
  }

  @Get('success/:etudiantId')
  @UserRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ETUDIANT)
  @ApiOperation({
    summary: 'Générer une attestation de réussite pour un étudiant',
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
  ) {
    const data = await this.certificateService.getSuccessAttestation(
      etudiantId,
      anneeId,
      req.user,
    );
    return {
      message: 'Attestation de réussite générée avec succès',
      data,
    };
  }

  @Get('history')
  @UserRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: "Consulter l'historique des documents générés" })
  @ApiQuery({
    name: 'etudiantId',
    required: false,
    description: 'Filtrer par étudiant',
  })
  async getHistory(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('etudiantId') etudiantId?: number,
  ) {
    const data = await this.certificateService.getHistory(
      paginationQuery,
      etudiantId,
    );
    return {
      message: 'Historique des documents récupéré avec succès',
      data,
    };
  }

  @Get('my-history')
  @UserRoles(UserRole.ETUDIANT)
  @ApiOperation({ summary: 'Consulter mon historique de documents (Étudiant)' })
  async getMyHistory(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() req: any,
  ) {
    const data = await this.certificateService.getHistory(
      paginationQuery,
      req.user.etudiantId,
    );
    return {
      message: 'Mon historique de documents récupéré avec succès',
      data,
    };
  }
}
