import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { GlobalSettingService } from './global-setting.service';
import { CreateGlobalSettingDto } from './dto/create-global-setting.dto';
import { UpdateGlobalSettingDto } from './dto/update-global-setting.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../user/entities/user.entity';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('global-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('global-settings')
export class GlobalSettingController {
  constructor(private readonly service: GlobalSettingService) {}

  // Endpoint public (aucune authentification) : lu par la page de
  // maintenance "AMPITSO", affichée à la place de l'appli, qui n'a donc pas
  // de session utilisateur. Ne renvoie que cette seule valeur (pas
  // findOne/findAll génériques) pour ne rien exposer d'autre publiquement.
  // Valeur par défaut codée en dur si le paramètre n'a jamais été créé en
  // base : modifiable ensuite via PATCH /global-settings/PAYMENT_OVERDUE_SINCE
  // (authentifié) sans redéploiement.
  @Get('public/payment-overdue-since')
  @Public()
  @ApiOperation({
    summary:
      'Date depuis laquelle le paiement est en retard (public, pour la page de maintenance)',
  })
  async getPaymentOverdueSince() {
    const value = await this.service.getValue(
      'PAYMENT_OVERDUE_SINCE',
      '2026-08-02T08:00:00',
    );
    return { overdueSince: value };
  }

  @Post()
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Ajouter un nouveau paramètre' })
  create(
    @Body() dto: CreateGlobalSettingDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.service.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les paramètres' })
  findAll(@CurrentEtablissement() tenantId?: number) {
    return this.service.findAll(tenantId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Récupérer un paramètre spécifique par sa clé' })
  findOne(
    @Param('key') key: string,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.service.findOne(key, tenantId);
  }

  @Patch(':key')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier un paramètre' })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateGlobalSettingDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.service.update(key, dto, tenantId);
  }

  @Delete(':key')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer un paramètre' })
  remove(@Param('key') key: string, @CurrentEtablissement() tenantId?: number) {
    return this.service.remove(key, tenantId);
  }
}
