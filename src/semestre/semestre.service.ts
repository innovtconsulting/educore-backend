import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSemestreDto } from './dto/create-semestre.dto';
import { UpdateSemestreDto } from './dto/update-semestre.dto';
import { Semestre } from './entities/semestre.entity';

@Injectable()
export class SemestreService {
  constructor(
    @InjectRepository(Semestre)
    private readonly semestreRepository: Repository<Semestre>,
  ) {}

  async create(createSemestreDto: CreateSemestreDto, tenantId?: number) {
    const { anneeUniversitaireId, ...data } = createSemestreDto;
    const semestre = this.semestreRepository.create({
      ...data,
      anneeUniversitaire: { id: anneeUniversitaireId },
    });
    return await this.semestreRepository.save(semestre);
  }

  async findAll(tenantId?: number) {
    const query = this.semestreRepository.createQueryBuilder('semestre');
    query.leftJoinAndSelect('semestre.anneeUniversitaire', 'annee');

    if (tenantId) {
      query.where('annee.etablissementId = :tenantId', { tenantId });
    }

    return await query.getMany();
  }

  async findOne(id: number, tenantId?: number) {
    const query = this.semestreRepository.createQueryBuilder('semestre');
    query.leftJoinAndSelect('semestre.anneeUniversitaire', 'annee');
    query.where('semestre.id = :id', { id });

    if (tenantId) {
      query.andWhere('annee.etablissementId = :tenantId', { tenantId });
    }

    const semestre = await query.getOne();
    if (!semestre) throw new NotFoundException(`Semestre #${id} non trouvé`);
    return semestre;
  }

  async update(id: number, updateSemestreDto: UpdateSemestreDto, tenantId?: number) {
    const semestre = await this.findOne(id, tenantId);
    Object.assign(semestre, updateSemestreDto);
    return await this.semestreRepository.save(semestre);
  }

  async remove(id: number, tenantId?: number) {
    const semestre = await this.findOne(id, tenantId);
    return await this.semestreRepository.remove(semestre);
  }
}
