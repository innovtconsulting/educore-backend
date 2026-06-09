import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNiveauDto } from './dto/create-niveau.dto';
import { UpdateNiveauDto } from './dto/update-niveau.dto';
import { Niveau } from './entities/niveau.entity';

@Injectable()
export class NiveauService {
  constructor(
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
  ) {}

  async create(createNiveauDto: CreateNiveauDto): Promise<Niveau> {
    const niveau = this.niveauRepository.create(createNiveauDto);
    return await this.niveauRepository.save(niveau);
  }

  async findAll(): Promise<Niveau[]> {
    return await this.niveauRepository.find();
  }

  async findOne(id: number): Promise<Niveau> {
    const niveau = await this.niveauRepository.findOneBy({ id });
    if (!niveau) {
      throw new NotFoundException(
        `Le niveau avec l'ID ${id} n'a pas été trouvé`,
      );
    }
    return niveau;
  }

  async update(id: number, updateNiveauDto: UpdateNiveauDto): Promise<Niveau> {
    const niveau = await this.findOne(id);
    Object.assign(niveau, updateNiveauDto);
    return await this.niveauRepository.save(niveau);
  }

  async remove(id: number): Promise<void> {
    const niveau = await this.findOne(id);
    await this.niveauRepository.remove(niveau);
  }
}
