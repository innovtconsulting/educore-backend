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
  async findAllPermissions(): Promise<Permission[]> {
    return await this.permissionRepository.find({ order: { name: 'ASC' } });
  }

  async findOnePermission(id: number): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission #${id} non trouvée`);
    }
    return permission;
  }

  async createPermission(data: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException(`La permission ${data.name} existe déjà`);
    }
    const permission = this.permissionRepository.create(data);
    return await this.permissionRepository.save(permission);
  }

  async updatePermission(
    id: number,
    data: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOnePermission(id);
    Object.assign(permission, data);
    return await this.permissionRepository.save(permission);
  }

  async removePermission(id: number): Promise<void> {
    const permission = await this.findOnePermission(id);

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
  async findAllRoles(): Promise<Role[]> {
    return await this.roleRepository.find({
      relations: { permissions: true },
      order: { name: 'ASC' },
    });
  }

  async findOneRole(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException(`Rôle #${id} non trouvé`);
    return role;
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { name },
      relations: { permissions: true },
    });
  }

  async createRole(data: CreateRoleDto): Promise<Role> {
    const { permissionIds, ...roleData } = data;
    const existing = await this.roleRepository.findOne({
      where: { name: roleData.name },
    });
    if (existing) {
      throw new ConflictException(`Le rôle ${roleData.name} existe déjà`);
    }

    const role = this.roleRepository.create(roleData);
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

  async updateRole(id: number, data: UpdateRoleDto): Promise<Role> {
    const { permissionIds, ...roleData } = data;
    const role = await this.findOneRole(id);

    if (roleData.name && roleData.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { name: roleData.name },
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

  async removeRole(id: number): Promise<void> {
    const role = await this.findOneRole(id);

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
