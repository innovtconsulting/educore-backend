import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AclService } from './acl.service';
import { UserRole } from '../user/entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
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
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister toutes les permissions' })
  findAllPermissions() {
    return this.aclService.findAllPermissions();
  }

  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister tous les rôles avec leurs permissions' })
  findAllRoles() {
    return this.aclService.findAllRoles();
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  createRole(@Body() data: any) {
    return this.aclService.createRole(data);
  }

  @Get('roles/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtenir un rôle par ID' })
  findOneRole(@Param('id') id: string) {
    return this.aclService.findOneRole(+id);
  }

  @Patch('roles/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier un rôle' })
  updateRole(@Param('id') id: string, @Body() data: any) {
    return this.aclService.updateRole(+id, data);
  }

  @Delete('roles/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un rôle' })
  removeRole(@Param('id') id: string) {
    return this.aclService.removeRole(+id);
  }
}
