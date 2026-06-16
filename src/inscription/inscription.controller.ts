import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../user/entities/user.entity';

@ApiTags('inscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inscriptions')
export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  @Post('reinscrire')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Réinscrire un étudiant pour une nouvelle année' })
  reinscrire(@Body() createInscriptionDto: CreateInscriptionDto) {
    return this.inscriptionService.reinscrire(createInscriptionDto);
  }

  @Post('diplomer/:etudiantId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Marquer un étudiant comme diplômé' })
  graduate(@Param('etudiantId') etudiantId: string) {
    return this.inscriptionService.graduate(+etudiantId);
  }

  @Get('rapport-diplomes')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir le rapport des diplômés par année' })
  getGraduatesReport() {
    return this.inscriptionService.getGraduatesReport();
  }

  @Get('eligibilite/:etudiantId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: "Vérifier l'éligibilité d'un étudiant à la réinscription",
  })
  checkEligibility(@Param('etudiantId') etudiantId: string) {
    return this.inscriptionService.checkEligibility(+etudiantId);
  }

  @Get('etudiant/:etudiantId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ETUDIANT)
  @ApiOperation({
    summary: "Consulter l'historique des inscriptions d'un étudiant",
  })
  getHistory(@Param('etudiantId') etudiantId: string, @Request() req: any) {
    // Si c'est un étudiant, il ne peut voir que son propre historique
    if (
      req.user.role === Role.ETUDIANT &&
      req.user.etudiantId !== +etudiantId
    ) {
      throw new BadRequestException(
        'Vous ne pouvez consulter que votre propre historique',
      );
    }
    return this.inscriptionService.getHistory(+etudiantId);
  }
}
