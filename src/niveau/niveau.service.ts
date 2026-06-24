import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateNiveauDto } from './dto/create-niveau.dto';
import { UpdateNiveauDto } from './dto/update-niveau.dto';
import { NiveauFilterDto } from './dto/niveau-filter.dto';
import { Niveau } from './entities/niveau.entity';
import { Classe } from '../classe/entities/classe.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class NiveauService {
  constructor(
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
  ) {}

  async create(createNiveauDto: CreateNiveauDto, tenantId?: number): Promise<Niveau> {
    const { name, parcoursId } = createNiveauDto;

    // Check if classe exists
    const classe = await this.classeRepository.findOne({
      where: TenantHelper.addTenantFilter(
        { id: parcoursId },
        tenantId,
        'etablissement',
      ),
    });

    if (!classe) {
      throw new NotFoundException('Parcours (classe) introuvable');
    }

    const niveau = this.niveauRepository.create({
      name,
      classe,
    });

    return await this.niveauRepository.save(niveau);
  }

  async findAll(filter: NiveauFilterDto, tenantId?: number): Promise<{ items: Niveau[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search, parcoursId } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.niveauRepository
      .createQueryBuilder('niveau')
      .leftJoinAndSelect('niveau.classe', 'classe');

    // Apply tenant filter
    if (tenantId) {
      queryBuilder.andWhere('classe.etablissementId = :tenantId', { tenantId });
    }

    // Apply search
    if (search) {
      queryBuilder.andWhere('niveau.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Apply parcours (classe) filter
    if (parcoursId) {
      queryBuilder.andWhere('classe.id = :parcoursId', { parcoursId });
    }

    const [items, total] = await queryBuilder
      .orderBy('niveau.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: number, tenantId?: number): Promise<Niveau> {
    const queryBuilder = this.niveauRepository
      .createQueryBuilder('niveau')
      .leftJoinAndSelect('niveau.classe', 'classe')
      .where('niveau.id = :id', { id });

    if (tenantId) {
      queryBuilder.andWhere('classe.etablissementId = :tenantId', { tenantId });
    }

    const niveau = await queryBuilder.getOne();

    if (!niveau) {
      throw new NotFoundException(
        `Le niveau avec l'ID ${id} n'a pas été trouvé`,
      );
    }
    return niveau;
  }

  async findByName(name: string, tenantId?: number): Promise<Niveau | null> {
    const queryBuilder = this.niveauRepository
      .createQueryBuilder('niveau')
      .leftJoinAndSelect('niveau.classe', 'classe')
      .where('niveau.name ILIKE :name', { name });

    if (tenantId) {
      queryBuilder.andWhere('classe.etablissementId = :tenantId', { tenantId });
    }

    return await queryBuilder.getOne();
  }

  async update(
    id: number,
    updateNiveauDto: UpdateNiveauDto,
    tenantId?: number,
  ): Promise<Niveau> {
    const { name, parcoursId } = updateNiveauDto;
    const niveau = await this.findOne(id, tenantId);

    if (name) {
      niveau.name = name;
    }

    if (parcoursId) {
      const classe = await this.classeRepository.findOne({
        where: TenantHelper.addTenantFilter(
          { id: parcoursId },
          tenantId,
          'etablissement',
        ),
      });
      if (!classe) {
        throw new NotFoundException('Parcours (classe) introuvable');
      }
      niveau.classe = classe;
    }

    return await this.niveauRepository.save(niveau);
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const niveau = await this.findOne(id, tenantId);
    await this.niveauRepository.remove(niveau);
  }
}
