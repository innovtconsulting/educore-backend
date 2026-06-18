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
import { AclService } from './acl.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('acl')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('acl')
export class AclController {
  constructor(private readonly aclService: AclService) {}

  @Get('permissions')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Lister toutes les permissions' })
  findAllPermissions() {
    return this.aclService.findAllPermissions();
  }

  @Get('roles')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Lister tous les rôles avec leurs permissions' })
  findAllRoles() {
    return this.aclService.findAllRoles();
  }

  @Post('roles')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  createRole(@Body() data: any) {
    return this.aclService.createRole(data);
  }

  @Get('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Obtenir un rôle par ID' })
  findOneRole(@Param('id') id: string) {
    return this.aclService.findOneRole(+id);
  }

  @Patch('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier un rôle' })
  updateRole(@Param('id') id: string, @Body() data: any) {
    return this.aclService.updateRole(+id, data);
  }

  @Delete('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer un rôle' })
  removeRole(@Param('id') id: string) {
    return this.aclService.removeRole(+id);
  }
}
