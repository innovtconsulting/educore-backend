import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateMatiereDto } from './dto/create-matiere.dto';
import { UpdateMatiereDto } from './dto/update-matiere.dto';
import { MatiereFilterDto } from './dto/matiere-filter.dto';
import { Matiere } from './entities/matiere.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class MatiereService {
  constructor(
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
  ) {}

  async create(
    createMatiereDto: CreateMatiereDto,
    tenantId?: number,
  ): Promise<Matiere> {
    const { code, name, coefficient, niveauId } = createMatiereDto;

    // Vérifier l'unicité du code
    const existingCode = await this.matiereRepository.findOneBy({ code });
    if (existingCode) {
      throw new BadRequestException(
        `Le code "${code}" existe déjà pour une matière`,
      );
    }

    // Vérifier l'existence du niveau
    const niveau = await this.niveauRepository.findOne({
      where: TenantHelper.addTenantFilter(
        { id: niveauId },
        tenantId,
        'classe.etablissement',
      ),
    });

    if (!niveau) {
      throw new NotFoundException('Niveau introuvable');
    }

    const matiere = this.matiereRepository.create({
      code,
      name,
      coefficient,
      niveau,
    });

    return await this.matiereRepository.save(matiere);
  }

  async findAll(
    filter: MatiereFilterDto,
    tenantId?: number,
  ): Promise<{ items: Matiere[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search, niveauId, parcoursId } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.matiereRepository
      .createQueryBuilder('matiere')
      .leftJoinAndSelect('matiere.niveau', 'niveau')
      .leftJoinAndSelect('niveau.classe', 'classe');

    // Apply tenant filter
    if (tenantId) {
      queryBuilder.andWhere('classe.etablissementId = :tenantId', { tenantId });
    }

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(matiere.name ILIKE :search OR matiere.code ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    // Apply niveau filter
    if (niveauId) {
      queryBuilder.andWhere('niveau.id = :niveauId', { niveauId });
    }

    // Apply parcours (classe) filter
    if (parcoursId) {
      queryBuilder.andWhere('classe.id = :parcoursId', { parcoursId });
    }

    const [items, total] = await queryBuilder
      .orderBy('matiere.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: number, tenantId?: number): Promise<Matiere> {
    const queryBuilder = this.matiereRepository
      .createQueryBuilder('matiere')
      .leftJoinAndSelect('matiere.niveau', 'niveau')
      .leftJoinAndSelect('niveau.classe', 'classe')
      .where('matiere.id = :id', { id });

    if (tenantId) {
      queryBuilder.andWhere('classe.etablissementId = :tenantId', { tenantId });
    }

    const matiere = await queryBuilder.getOne();

    if (!matiere) {
      throw new NotFoundException(
        `La matière avec l'ID ${id} n'a pas été trouvée`,
      );
    }
    return matiere;
  }

  async findByCode(code: string, tenantId?: number): Promise<Matiere | null> {
    const queryBuilder = this.matiereRepository
      .createQueryBuilder('matiere')
      .leftJoinAndSelect('matiere.niveau', 'niveau')
      .leftJoinAndSelect('niveau.classe', 'classe')
      .where('matiere.code = :code', { code });

    if (tenantId) {
      queryBuilder.andWhere('classe.etablissementId = :tenantId', { tenantId });
    }

    return await queryBuilder.getOne();
  }

  async update(
    id: number,
    updateMatiereDto: UpdateMatiereDto,
    tenantId?: number,
  ): Promise<Matiere> {
    const { code, name, coefficient, niveauId } = updateMatiereDto;
    const matiere = await this.findOne(id, tenantId);

    if (code && code !== matiere.code) {
      const existingCode = await this.matiereRepository.findOneBy({ code });
      if (existingCode) {
        throw new BadRequestException(
          `Le code "${code}" existe déjà pour une matière`,
        );
      }
      matiere.code = code;
    }

    if (name) {
      matiere.name = name;
    }

    if (coefficient !== undefined) {
      matiere.coefficient = coefficient;
    }

    if (niveauId) {
      const niveau = await this.niveauRepository.findOne({
        where: TenantHelper.addTenantFilter(
          { id: niveauId },
          tenantId,
          'classe.etablissement',
        ),
      });
      if (!niveau) {
        throw new NotFoundException('Niveau introuvable');
      }
      matiere.niveau = niveau;
    }

    return await this.matiereRepository.save(matiere);
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const matiere = await this.findOne(id, tenantId);
    await this.matiereRepository.remove(matiere);
  }
}
