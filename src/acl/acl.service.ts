import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class AclService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  // --- Permissions ---
  async findAllPermissions(tenantId?: number): Promise<Permission[]> {
    const where: any = {};
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    return await this.permissionRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findOnePermission(id: number, tenantId?: number): Promise<Permission> {
    const where: any = { id };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    const permission = await this.permissionRepository.findOne({
      where,
    });
    if (!permission) {
      throw new NotFoundException(`Permission #${id} non trouvée`);
    }
    return permission;
  }

  async createPermission(
    data: CreatePermissionDto,
    tenantId?: number,
  ): Promise<Permission> {
    const where: any = { name: data.name };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    const existing = await this.permissionRepository.findOne({
      where,
    });
    if (existing) {
      throw new ConflictException(`La permission ${data.name} existe déjà`);
    }
    const permission = this.permissionRepository.create({
      ...data,
      etablissement: tenantId ? { id: tenantId } : undefined,
    });
    return await this.permissionRepository.save(permission);
  }

  async updatePermission(
    id: number,
    data: UpdatePermissionDto,
    tenantId?: number,
  ): Promise<Permission> {
    const permission = await this.findOnePermission(id, tenantId);
    Object.assign(permission, data);
    return await this.permissionRepository.save(permission);
  }

  async removePermission(id: number, tenantId?: number): Promise<void> {
    const permission = await this.findOnePermission(id, tenantId);

    const rolesUsingPermission = await this.roleRepository
      .createQueryBuilder('role')
      .innerJoin('role.permissions', 'permission', 'permission.id = :id', {
        id,
      })
      .getCount();

    if (rolesUsingPermission > 0) {
      throw new ConflictException(
        `Cette permission est assignée à ${rolesUsingPermission} rôle(s). Retirez-la des rôles avant suppression.`,
      );
    }

    await this.permissionRepository.remove(permission);
  }

  // --- Roles ---
  async findAllRoles(tenantId?: number): Promise<Role[]> {
    const where: any = {};
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    return await this.roleRepository.find({
      where,
      relations: { permissions: true },
      order: { name: 'ASC' },
    });
  }

  async findOneRole(id: number, tenantId?: number): Promise<Role> {
    const where: any = { id };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    const role = await this.roleRepository.findOne({
      where,
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException(`Rôle #${id} non trouvé`);
    return role;
  }

  async findRoleByName(name: string, tenantId?: number): Promise<Role | null> {
    const where: any = { name };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    return await this.roleRepository.findOne({
      where,
      relations: { permissions: true },
    });
  }

  async createRole(data: CreateRoleDto, tenantId?: number): Promise<Role> {
    const { permissionIds, ...roleData } = data;
    const where: any = { name: roleData.name };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    const existing = await this.roleRepository.findOne({
      where,
    });
    if (existing) {
      throw new ConflictException(`Le rôle ${roleData.name} existe déjà`);
    }

    const role = this.roleRepository.create({
      ...roleData,
      etablissement: tenantId ? { id: tenantId } : undefined,
    });
    role.permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });

    if (role.permissions.length !== permissionIds.length) {
      throw new NotFoundException(
        'Une ou plusieurs permissions sélectionnées sont introuvables',
      );
    }

    return await this.roleRepository.save(role);
  }

  async updateRole(
    id: number,
    data: UpdateRoleDto,
    tenantId?: number,
  ): Promise<Role> {
    const { permissionIds, ...roleData } = data;
    const role = await this.findOneRole(id, tenantId);

    if (roleData.name && roleData.name !== role.name) {
      const where: any = { name: roleData.name };
      if (tenantId) {
        where.etablissement = { id: tenantId };
      }
      const existing = await this.roleRepository.findOne({
        where,
      });
      if (existing) {
        throw new ConflictException(`Le rôle ${roleData.name} existe déjà`);
      }
    }

    if (permissionIds) {
      role.permissions = await this.permissionRepository.findBy({
        id: In(permissionIds),
      });

      if (role.permissions.length !== permissionIds.length) {
        throw new NotFoundException(
          'Une ou plusieurs permissions sélectionnées sont introuvables',
        );
      }
    }

    Object.assign(role, roleData);
    return await this.roleRepository.save(role);
  }

  async removeRole(id: number, tenantId?: number): Promise<void> {
    const role = await this.findOneRole(id, tenantId);

    const usersCount = await this.roleRepository.manager
      .createQueryBuilder()
      .from('user', 'user')
      .where('user.roleId = :id', { id })
      .getCount();

    if (usersCount > 0) {
      throw new ConflictException(
        `Ce rôle est assigné à ${usersCount} utilisateur(s) et ne peut pas être supprimé`,
      );
    }

    await this.roleRepository.remove(role);
  }
}
