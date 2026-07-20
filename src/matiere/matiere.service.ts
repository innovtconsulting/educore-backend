import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
    const {
      code,
      name,
      coefficient,
      hours,
      niveauIds,
      numeroUe,
      elementsConstitutifs,
      tpTd,
      tpe,
      vht,
      credits,
    } = createMatiereDto;

    const niveaux = await this.niveauRepository.find({
      where: TenantHelper.addTenantFilter(
        { id: In(niveauIds) },
        tenantId,
        'classe.etablissement',
      ),
    });

    if (niveaux.length !== niveauIds.length) {
      throw new NotFoundException('Un ou plusieurs niveaux introuvables');
    }

    const matiere = this.matiereRepository.create({
      code,
      name,
      coefficient,
      hours,
      niveaux,
      etablissementId: tenantId,
      numeroUe,
      elementsConstitutifs,
      tpTd,
      tpe,
      vht,
      credits,
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
      .leftJoinAndSelect('matiere.niveaux', 'niveaux')
      .leftJoinAndSelect('niveaux.classe', 'classe');

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
      queryBuilder.andWhere('niveaux.id = :niveauId', { niveauId });
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
      .leftJoinAndSelect('matiere.niveaux', 'niveaux')
      .leftJoinAndSelect('niveaux.classe', 'classe')
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
      .leftJoinAndSelect('matiere.niveaux', 'niveaux')
      .leftJoinAndSelect('niveaux.classe', 'classe')
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
    const {
      code,
      name,
      coefficient,
      hours,
      niveauIds,
      numeroUe,
      elementsConstitutifs,
      tpTd,
      tpe,
      vht,
      credits,
    } = updateMatiereDto;
    const matiere = await this.findOne(id, tenantId);

    if (code) {
      matiere.code = code;
    }

    if (name) {
      matiere.name = name;
    }

    if (coefficient !== undefined) {
      matiere.coefficient = coefficient;
    }

    if (hours !== undefined) {
      matiere.hours = hours;
    }

    if (numeroUe !== undefined) {
      matiere.numeroUe = numeroUe;
    }

    if (elementsConstitutifs !== undefined) {
      matiere.elementsConstitutifs = elementsConstitutifs;
    }

    if (tpTd !== undefined) {
      matiere.tpTd = tpTd;
    }

    if (tpe !== undefined) {
      matiere.tpe = tpe;
    }

    if (vht !== undefined) {
      matiere.vht = vht;
    }

    if (credits !== undefined) {
      matiere.credits = credits;
    }

    if (niveauIds !== undefined) {
      const niveaux = await this.niveauRepository.find({
        where: TenantHelper.addTenantFilter(
          { id: In(niveauIds) },
          tenantId,
          'classe.etablissement',
        ),
      });
      if (niveaux.length !== niveauIds.length) {
        throw new NotFoundException('Un ou plusieurs niveaux introuvables');
      }
      matiere.niveaux = niveaux;
    }

    return await this.matiereRepository.save(matiere);
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const matiere = await this.findOne(id, tenantId);
    await this.matiereRepository.remove(matiere);
  }
}
