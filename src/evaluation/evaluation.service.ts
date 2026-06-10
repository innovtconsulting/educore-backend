import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { Evaluation } from './entities/evaluation.entity';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {}

  async create(createEvaluationDto: CreateEvaluationDto) {
    const { matiereId, classeId, niveauId, semestreId, ...data } =
      createEvaluationDto;
    const evaluation = this.evaluationRepository.create({
      ...data,
      matiere: { id: matiereId },
      classe: { id: classeId },
      niveau: { id: niveauId },
      semestre: { id: semestreId },
    });
    return await this.evaluationRepository.save(evaluation);
  }

  async findAll() {
    return await this.evaluationRepository.find({
      relations: {
        matiere: true,
        classe: true,
        niveau: true,
        semestre: true,
      },
    });
  }

  async findOne(id: number) {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: {
        matiere: true,
        classe: true,
        niveau: true,
        semestre: true,
        notes: { etudiant: true },
      },
    });
    if (!evaluation)
      throw new NotFoundException(`Evaluation #${id} non trouvé`);
    return evaluation;
  }

  async update(id: number, updateEvaluationDto: UpdateEvaluationDto) {
    const evaluation = await this.findOne(id);
    Object.assign(evaluation, updateEvaluationDto);
    return await this.evaluationRepository.save(evaluation);
  }

  async remove(id: number) {
    const evaluation = await this.findOne(id);
    return await this.evaluationRepository.remove(evaluation);
  }
}
