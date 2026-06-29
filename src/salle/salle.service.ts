import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Salle } from './entities/salle.entity';
import { CreateSalleDto } from './dto/create-salle.dto';
import { UpdateSalleDto } from './dto/update-salle.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class SalleService {
  constructor(
    @InjectRepository(Salle)
    private readonly salleRepository: Repository<Salle>,
  ) {}

  async create(createSalleDto: CreateSalleDto, tenantId?: number) {
    const finalEtablissementId = tenantId || createSalleDto.etablissementId;
    if (!finalEtablissementId) {
      throw new Error("ID d'établissement manquant");
    }
    const salle = this.salleRepository.create({
      ...createSalleDto,
      etablissement: { id: finalEtablissementId },
    });
    return await this.salleRepository.save(salle);
  }

  async findAll(paginationQuery: PaginationQueryDto, tenantId?: number) {
    const { page = 1, limit = 20 } = paginationQuery;
    const skip = (page - 1) * limit;

    const query = this.salleRepository.createQueryBuilder('s');

    if (tenantId) {
      query.where('s.etablissementId = :tenantId', { tenantId });
    }

    const [items, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, tenantId?: number) {
    const where: any = { id };
    if (tenantId) where.etablissement = { id: tenantId };

    const salle = await this.salleRepository.findOne({ where });
    if (!salle) throw new NotFoundException(`Salle #${id} non trouvée`);
    return salle;
  }

  async update(id: number, updateSalleDto: UpdateSalleDto, tenantId?: number) {
    const salle = await this.findOne(id, tenantId);
    const { etablissementId, ...data } = updateSalleDto;

    if (etablissementId) {
      salle.etablissement = { id: etablissementId } as any;
    }

    Object.assign(salle, data);
    return await this.salleRepository.save(salle);
  }

  async remove(id: number, tenantId?: number) {
    const salle = await this.findOne(id, tenantId);
    return await this.salleRepository.remove(salle);
  }
}
