import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { Evaluation } from './entities/evaluation.entity';
import { Classe } from '../classe/entities/classe.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EnseignantService } from '../enseignant/enseignant.service';
import { Role } from '../user/entities/user.entity';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    private readonly enseignantService: EnseignantService,
  ) {}

  async create(createEvaluationDto: CreateEvaluationDto, user: any) {
    const { matiereId, classeId, niveauId, semestreId, ...data } =
      createEvaluationDto;

    // Vérifier la responsabilité si c'est un enseignant
    if (user.role === Role.ENSEIGNANT) {
      const queryRunner = this.evaluationRepository.manager.connection.createQueryRunner();
      const classe = await queryRunner.manager.getRepository(Classe).findOne({
        where: { id: classeId },
        relations: { etablissements: true },
      });
      await queryRunner.release();

      if (!classe) throw new NotFoundException('Classe introuvable');

      const etablissementIds = classe.etablissements.map((e) => e.id);

      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        matiereId,
        niveauId,
        etablissementIds,
      );
      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de cette matière pour ce niveau dans cet établissement",
        );
      }
    }

    const evaluation = this.evaluationRepository.create({
      ...data,
      matiere: { id: matiereId },
      classe: { id: classeId },
      niveau: { id: niveauId },
      semestre: { id: semestreId },
    });
    return await this.evaluationRepository.save(evaluation);
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [items, total] = await this.evaluationRepository.findAndCount({
      relations: {
        matiere: true,
        classe: true,
        niveau: true,
        semestre: true,
      },
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id },
      relations: {
        matiere: true,
        classe: { etablissements: true },
        niveau: true,
        semestre: true,
        notes: { etudiant: true },
      },
    });
    if (!evaluation)
      throw new NotFoundException(`Evaluation #${id} non trouvé`);
    return evaluation;
  }

  async update(id: number, updateEvaluationDto: UpdateEvaluationDto, user: any) {
    const evaluation = await this.findOne(id);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        evaluation.matiere.id,
        evaluation.niveau.id,
        etablissementIds,
      );
      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de cette matière",
        );
      }
    }

    Object.assign(evaluation, updateEvaluationDto);
    return await this.evaluationRepository.save(evaluation);
  }

  async remove(id: number, user: any) {
    const evaluation = await this.findOne(id);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        evaluation.matiere.id,
        evaluation.niveau.id,
        etablissementIds,
      );
      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de cette matière",
        );
      }
    }

    return await this.evaluationRepository.remove(evaluation);
  }
}
