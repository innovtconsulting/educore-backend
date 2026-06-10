import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnneeUniversitaireDto } from './dto/create-annee-universitaire.dto';
import { UpdateAnneeUniversitaireDto } from './dto/update-annee-universitaire.dto';
import { AnneeUniversitaire } from './entities/annee-universitaire.entity';

@Injectable()
export class AnneeUniversitaireService {
  constructor(
    @InjectRepository(AnneeUniversitaire)
    private readonly repo: Repository<AnneeUniversitaire>,
  ) {}

  async create(dto: CreateAnneeUniversitaireDto) {
    if (dto.isActive) {
      await this.repo.update({}, { isActive: false });
    }
    const annee = this.repo.create(dto);
    return await this.repo.save(annee);
  }

  async findAll() {
    return await this.repo.find({
      order: { label: 'DESC' },
      relations: { semestres: true },
    });
  }

  async findOne(id: number) {
    const annee = await this.repo.findOne({
      where: { id },
      relations: { semestres: true },
    });
    if (!annee) throw new NotFoundException(`Année universitaire #${id} non trouvée`);
    return annee;
  }

  async update(id: number, dto: UpdateAnneeUniversitaireDto) {
    const annee = await this.findOne(id);
    if (dto.isActive && !annee.isActive) {
      await this.repo.update({}, { isActive: false });
    }
    Object.assign(annee, dto);
    return await this.repo.save(annee);
  }

  async remove(id: number) {
    const annee = await this.findOne(id);
    return await this.repo.remove(annee);
  }

  async getActiveYear() {
    const active = await this.repo.findOne({ where: { isActive: true } });
    if (!active) throw new NotFoundException('Aucune année universitaire active');
    return active;
  }
}
