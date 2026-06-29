import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AclService } from './acl.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CurrentEtablissement } from '../auth/decorators/current-etablissement.decorator';

@ApiTags('acl')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('acl')
export class AclController {
  constructor(private readonly aclService: AclService) {}

  @Get('permissions')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Lister toutes les permissions' })
  findAllPermissions(@CurrentEtablissement() tenantId?: number) {
    return this.aclService.findAllPermissions(tenantId);
  }

  @Get('permissions/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Obtenir une permission par ID' })
  findOnePermission(@Param('id', ParseIntPipe) id: number, @CurrentEtablissement() tenantId?: number) {
    return this.aclService.findOnePermission(id, tenantId);
  }

  @Post('permissions')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Créer une nouvelle permission' })
  createPermission(@Body() data: CreatePermissionDto, @CurrentEtablissement() tenantId?: number) {
    return this.aclService.createPermission(data, tenantId);
  }

  @Patch('permissions/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier une permission' })
  updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePermissionDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.aclService.updatePermission(id, data, tenantId);
  }

  @Delete('permissions/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer une permission' })
  removePermission(@Param('id', ParseIntPipe) id: number, @CurrentEtablissement() tenantId?: number) {
    return this.aclService.removePermission(id, tenantId);
  }

  @Get('roles')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Lister tous les rôles avec leurs permissions' })
  findAllRoles(@CurrentEtablissement() tenantId?: number) {
    return this.aclService.findAllRoles(tenantId);
  }

  @Post('roles')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  createRole(@Body() data: CreateRoleDto, @CurrentEtablissement() tenantId?: number) {
    return this.aclService.createRole(data, tenantId);
  }

  @Get('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Obtenir un rôle par ID' })
  findOneRole(@Param('id', ParseIntPipe) id: number, @CurrentEtablissement() tenantId?: number) {
    return this.aclService.findOneRole(id, tenantId);
  }

  @Patch('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier un rôle' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateRoleDto,
    @CurrentEtablissement() tenantId?: number,
  ) {
    return this.aclService.updateRole(id, data, tenantId);
  }

  @Delete('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer un rôle' })
  removeRole(@Param('id', ParseIntPipe) id: number, @CurrentEtablissement() tenantId?: number) {
    return this.aclService.removeRole(id, tenantId);
  }
}
