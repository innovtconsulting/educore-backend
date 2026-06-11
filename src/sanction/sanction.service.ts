import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSanctionDto } from './dto/create-sanction.dto';
import { UpdateSanctionDto } from './dto/update-sanction.dto';
import { Sanction } from './entities/sanction.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class SanctionService {
  constructor(
    @InjectRepository(Sanction)
    private readonly sanctionRepository: Repository<Sanction>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
  ) {}

  async create(createSanctionDto: CreateSanctionDto): Promise<Sanction> {
    const { etudiantId, ...rest } = createSanctionDto;

    const etudiant = await this.etudiantRepository.findOneBy({ id: etudiantId });
    if (!etudiant) {
      throw new NotFoundException(`Étudiant #${etudiantId} introuvable`);
    }

    const sanction = this.sanctionRepository.create({
      ...rest,
      etudiant,
      dateDecision: new Date(rest.dateDecision),
      dateDebut: rest.dateDebut ? new Date(rest.dateDebut) : undefined,
      dateFin: rest.dateFin ? new Date(rest.dateFin) : undefined,
    });

    return await this.sanctionRepository.save(sanction);
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [items, total] = await this.sanctionRepository.findAndCount({
      relations: { etudiant: true },
      order: { dateDecision: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findByEtudiant(etudiantId: number): Promise<Sanction[]> {
    return await this.sanctionRepository.find({
      where: { etudiant: { id: etudiantId } },
      relations: { etudiant: true },
      order: { dateDecision: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Sanction> {
    const sanction = await this.sanctionRepository.findOne({
      where: { id },
      relations: { etudiant: true },
    });
    if (!sanction) {
      throw new NotFoundException(`Sanction #${id} introuvable`);
    }
    return sanction;
  }

  async update(id: number, updateSanctionDto: UpdateSanctionDto): Promise<Sanction> {
    const sanction = await this.findOne(id);
    const { etudiantId, ...rest } = updateSanctionDto;

    if (etudiantId) {
      const etudiant = await this.etudiantRepository.findOneBy({ id: etudiantId });
      if (!etudiant) {
        throw new NotFoundException(`Étudiant #${etudiantId} introuvable`);
      }
      sanction.etudiant = etudiant;
    }

    if (rest.type) sanction.type = rest.type;
    if (rest.motif) sanction.motif = rest.motif;
    if (rest.isApplied !== undefined) sanction.isApplied = rest.isApplied;
    if (rest.dateDecision) sanction.dateDecision = new Date(rest.dateDecision);
    if (rest.dateDebut) sanction.dateDebut = new Date(rest.dateDebut);
    if (rest.dateFin) sanction.dateFin = new Date(rest.dateFin);

    return await this.sanctionRepository.save(sanction);
  }

  async remove(id: number): Promise<void> {
    const sanction = await this.findOne(id);
    await this.sanctionRepository.remove(sanction);
  }
}
