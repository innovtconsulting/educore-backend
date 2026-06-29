import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { Parent } from './entities/parent.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  async create(createParentDto: CreateParentDto): Promise<Parent> {
    const parent = this.parentRepository.create(createParentDto);
    return await this.parentRepository.save(parent);
  }

  async findAll(paginationQuery: PaginationQueryDto, tenantId?: number) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;
    const where = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiants.etablissement',
    );

    const [items, total] = await this.parentRepository.findAndCount({
      where: where,
      relations: { etudiants: true },
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, tenantId?: number): Promise<Parent> {
    const where = TenantHelper.addTenantFilter(
      { id },
      tenantId,
      'etudiants.etablissement',
    );

    const parent = await this.parentRepository.findOne({
      where: where,
      relations: { etudiants: true },
    });
    if (!parent) throw new NotFoundException(`Parent #${id} introuvable`);
    return parent;
  }

  async update(
    id: number,
    updateParentDto: UpdateParentDto,
    tenantId?: number,
  ): Promise<Parent> {
    const parent = await this.findOne(id, tenantId);
    Object.assign(parent, updateParentDto);
    return await this.parentRepository.save(parent);
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const parent = await this.findOne(id, tenantId);
    await this.parentRepository.remove(parent);
  }

  async assertParentOfEtudiant(
    parentId: number,
    etudiantId: number,
  ): Promise<void> {
    const parent = await this.parentRepository.findOne({
      where: { id: parentId },
      relations: { etudiants: true },
    });

    if (!parent) {
      throw new NotFoundException('Profil parent introuvable');
    }

    const isLinked = parent.etudiants.some(
      (etudiant) => etudiant.id === etudiantId,
    );
    if (!isLinked) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que les données de vos enfants',
      );
    }
  }

  async getContacts(search?: string, tenantId?: number): Promise<Parent[]> {
    const query = this.parentRepository
      .createQueryBuilder('parent')
      .leftJoinAndSelect('parent.etudiants', 'etudiant')
      .select([
        'parent.id',
        'parent.firstName',
        'parent.lastName',
        'parent.phoneNumber',
        'parent.email',
        'parent.gender',
        'etudiant.id',
        'etudiant.firstName',
        'etudiant.lastName',
        'etudiant.matricule',
      ]);

    if (tenantId) {
      query.andWhere('etudiant.etablissementId = :tenantId', { tenantId });
    }

    if (search) {
      query.andWhere(
        '(parent.firstName ILIKE :search OR parent.lastName ILIKE :search OR etudiant.firstName ILIKE :search OR etudiant.lastName ILIKE :search OR etudiant.matricule ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return await query.getMany();
  }
}
