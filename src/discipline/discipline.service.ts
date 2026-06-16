import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline, DisciplineCategory } from './entities/discipline.entity';
import { CreateDisciplineDto } from './dto/create-discipline.dto';
import { UpdateDisciplineDto } from './dto/update-discipline.dto';
import { TenantContext } from '../common/tenant/tenant.context';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class DisciplineService {
  constructor(
    @InjectRepository(Discipline)
    private readonly disciplineRepository: Repository<Discipline>,
  ) {}

  async create(createDisciplineDto: CreateDisciplineDto): Promise<Discipline> {
    const tenantId = TenantContext.getTenantId();
    const discipline = this.disciplineRepository.create({
      ...createDisciplineDto,
      etablissement: tenantId ? { id: tenantId } : undefined,
    });
    return await this.disciplineRepository.save(discipline);
  }

  async findAll(category?: DisciplineCategory): Promise<Discipline[]> {
    const tenantId = TenantContext.getTenantId();
    let where: any = category ? { category } : {};
    where = TenantHelper.addTenantFilter(where, tenantId);

    return await this.disciplineRepository.find({
      where,
      order: { category: 'ASC', title: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Discipline> {
    const tenantId = TenantContext.getTenantId();
    const where = TenantHelper.addTenantFilter({ id }, tenantId);

    const discipline = await this.disciplineRepository.findOneBy(where);
    if (!discipline) {
      throw new NotFoundException(`Discipline #${id} non trouvée`);
    }
    return discipline;
  }

  async update(
    id: number,
    updateDisciplineDto: UpdateDisciplineDto,
  ): Promise<Discipline> {
    const discipline = await this.findOne(id);
    Object.assign(discipline, updateDisciplineDto);
    return await this.disciplineRepository.save(discipline);
  }

  async remove(id: number): Promise<void> {
    const discipline = await this.findOne(id);
    await this.disciplineRepository.remove(discipline);
  }
}
