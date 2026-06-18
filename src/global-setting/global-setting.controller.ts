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

@ApiTags('global-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('global-settings')
export class GlobalSettingController {
  constructor(private readonly service: GlobalSettingService) {}

  @Post()
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Ajouter un nouveau paramètre global (SuperAdmin)' })
  create(@Body() dto: CreateGlobalSettingDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les paramètres globaux' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Récupérer un paramètre spécifique par sa clé' })
  findOne(@Param('key') key: string) {
    return this.service.findOne(key);
  }

  @Patch(':key')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier un paramètre global (SuperAdmin)' })
  update(@Param('key') key: string, @Body() dto: UpdateGlobalSettingDto) {
    return this.service.update(key, dto);
  }

  @Delete(':key')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer un paramètre global (SuperAdmin)' })
  remove(@Param('key') key: string) {
    return this.service.remove(key);
  }
}
