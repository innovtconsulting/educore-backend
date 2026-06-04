import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEtablissementDto } from './dto/create-etablissement.dto';
import { UpdateEtablissementDto } from './dto/update-etablissement.dto';
import { Etablissement } from './entities/etablissement.entity';

@Injectable()
export class EtablissementService {
  constructor(
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
  ) {}

  async create(createEtablissementDto: CreateEtablissementDto): Promise<Etablissement> {
    const etablissement = this.etablissementRepository.create(createEtablissementDto);
    return await this.etablissementRepository.save(etablissement);
  }

  async findAll(): Promise<Etablissement[]> {
    return await this.etablissementRepository.find();
  }

  async findOne(id: number): Promise<Etablissement> {
    const etablissement = await this.etablissementRepository.findOneBy({ id });
    if (!etablissement) {
      throw new NotFoundException(`L'établissement avec l'ID ${id} n'a pas été trouvé`);
    }
    return etablissement;
  }

  async update(id: number, updateEtablissementDto: UpdateEtablissementDto): Promise<Etablissement> {
    const etablissement = await this.findOne(id);
    Object.assign(etablissement, updateEtablissementDto);
    return await this.etablissementRepository.save(etablissement);
  }

  async remove(id: number): Promise<void> {
    const etablissement = await this.findOne(id);
    await this.etablissementRepository.remove(etablissement);
  }
}
