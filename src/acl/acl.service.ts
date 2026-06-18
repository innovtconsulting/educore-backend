import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

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

  async createPermission(data: Partial<Permission>): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({ where: { name: data.name } });
    if (existing) throw new ConflictException(`La permission ${data.name} existe déjà`);
    const permission = this.permissionRepository.create(data);
    return await this.permissionRepository.save(permission);
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

  async createRole(data: Partial<Role> & { permissionIds?: number[] }): Promise<Role> {
    const { permissionIds, ...roleData } = data;
    const existing = await this.roleRepository.findOne({ where: { name: roleData.name } });
    if (existing) throw new ConflictException(`Le rôle ${roleData.name} existe déjà`);

    const role = this.roleRepository.create(roleData);
    if (permissionIds && permissionIds.length > 0) {
      role.permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    }
    return await this.roleRepository.save(role);
  }

  async updateRole(id: number, data: Partial<Role> & { permissionIds?: number[] }): Promise<Role> {
    const { permissionIds, ...roleData } = data;
    const role = await this.findOneRole(id);

    if (permissionIds) {
      role.permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    }

    Object.assign(role, roleData);
    return await this.roleRepository.save(role);
  }

  async removeRole(id: number): Promise<void> {
    const role = await this.findOneRole(id);
    await this.roleRepository.remove(role);
  }
}
