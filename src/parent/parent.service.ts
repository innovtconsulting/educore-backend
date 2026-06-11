import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { Parent } from './entities/parent.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

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

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [items, total] = await this.parentRepository.findAndCount({
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

  async findOne(id: number): Promise<Parent> {
    const parent = await this.parentRepository.findOne({
      where: { id },
      relations: { etudiants: true },
    });
    if (!parent) throw new NotFoundException(`Parent #${id} introuvable`);
    return parent;
  }

  async update(id: number, updateParentDto: UpdateParentDto): Promise<Parent> {
    const parent = await this.findOne(id);
    Object.assign(parent, updateParentDto);
    return await this.parentRepository.save(parent);
  }

  async remove(id: number): Promise<void> {
    const parent = await this.findOne(id);
    await this.parentRepository.remove(parent);
  }

  async getContacts(search?: string): Promise<Parent[]> {
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

    if (search) {
      query.where(
        '(parent.firstName ILIKE :search OR parent.lastName ILIKE :search OR etudiant.firstName ILIKE :search OR etudiant.lastName ILIKE :search OR etudiant.matricule ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    return await query.getMany();
  }
}
