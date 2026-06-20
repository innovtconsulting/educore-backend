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

  @Get('permissions/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Obtenir une permission par ID' })
  findOnePermission(@Param('id', ParseIntPipe) id: number) {
    return this.aclService.findOnePermission(id);
  }

  @Post('permissions')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Créer une nouvelle permission' })
  createPermission(@Body() data: CreatePermissionDto) {
    return this.aclService.createPermission(data);
  }

  @Patch('permissions/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier une permission' })
  updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePermissionDto,
  ) {
    return this.aclService.updatePermission(id, data);
  }

  @Delete('permissions/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer une permission' })
  removePermission(@Param('id', ParseIntPipe) id: number) {
    return this.aclService.removePermission(id);
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
  createRole(@Body() data: CreateRoleDto) {
    return this.aclService.createRole(data);
  }

  @Get('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Obtenir un rôle par ID' })
  findOneRole(@Param('id', ParseIntPipe) id: number) {
    return this.aclService.findOneRole(id);
  }

  @Patch('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Modifier un rôle' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateRoleDto,
  ) {
    return this.aclService.updateRole(id, data);
  }

  @Delete('roles/:id')
  @Permissions('CONFIG_MANAGE')
  @ApiOperation({ summary: 'Supprimer un rôle' })
  removeRole(@Param('id', ParseIntPipe) id: number) {
    return this.aclService.removeRole(id);
  }
}
