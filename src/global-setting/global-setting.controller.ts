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

@ApiTags('global-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('global-settings')
export class GlobalSettingController {
  constructor(private readonly service: GlobalSettingService) {}

  @Post()
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Ajouter un nouveau paramètre' })
  create(@Body() dto: CreateGlobalSettingDto, @CurrentEtablissement() tenantId?: number) {
    return this.service.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les paramètres' })
  findAll(@CurrentEtablissement() tenantId?: number) {
    return this.service.findAll(tenantId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Récupérer un paramètre spécifique par sa clé' })
  findOne(@Param('key') key: string, @CurrentEtablissement() tenantId?: number) {
    return this.service.findOne(key, tenantId);
  }

  @Patch(':key')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier un paramètre' })
  update(@Param('key') key: string, @Body() dto: UpdateGlobalSettingDto, @CurrentEtablissement() tenantId?: number) {
    return this.service.update(key, dto, tenantId);
  }

  @Delete(':key')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer un paramètre' })
  remove(@Param('key') key: string, @CurrentEtablissement() tenantId?: number) {
    return this.service.remove(key, tenantId);
  }
}
