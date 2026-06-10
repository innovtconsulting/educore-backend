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

  async create(createSemestreDto: CreateSemestreDto) {
    const { anneeUniversitaireId, ...data } = createSemestreDto;
    const semestre = this.semestreRepository.create({
      ...data,
      anneeUniversitaire: { id: anneeUniversitaireId },
    });
    return await this.semestreRepository.save(semestre);
  }

  async findAll() {
    return await this.semestreRepository.find({
      relations: { anneeUniversitaire: true },
    });
  }

  async findOne(id: number) {
    const semestre = await this.semestreRepository.findOne({ where: { id } });
    if (!semestre) throw new NotFoundException(`Semestre #${id} non trouvé`);
    return semestre;
  }

  async update(id: number, updateSemestreDto: UpdateSemestreDto) {
    const semestre = await this.findOne(id);
    Object.assign(semestre, updateSemestreDto);
    return await this.semestreRepository.save(semestre);
  }

  async remove(id: number) {
    const semestre = await this.findOne(id);
    return await this.semestreRepository.remove(semestre);
  }
}
