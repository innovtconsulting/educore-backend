import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async create(
    createEvaluationDto: CreateEvaluationDto,
    user: any,
    tenantId?: number,
  ) {
    const { matiereId, classeId, niveauId, semestreId, ...data } =
      createEvaluationDto;

    // Vérifier la responsabilité si c'est un enseignant
    if (user.role === Role.ENSEIGNANT) {
      const queryRunner =
        this.evaluationRepository.manager.connection.createQueryRunner();
      const classe = await queryRunner.manager.getRepository(Classe).findOne({
        where: { id: classeId },
        relations: { etablissement: true },
      });
      await queryRunner.release();

      if (!classe) throw new NotFoundException('Classe introuvable');

      const etablissementIds = [classe.etablissement.id];

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

  async findAll(paginationQuery: PaginationQueryDto, tenantId?: number) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const query = this.evaluationRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.matiere', 'matiere')
      .leftJoinAndSelect('e.classe', 'classe')
      .leftJoinAndSelect('classe.etablissement', 'etablissement')
      .leftJoinAndSelect('e.niveau', 'niveau')
      .leftJoinAndSelect('e.semestre', 'semestre');

    if (tenantId) {
      query.andWhere('etablissement.id = :tenantId', { tenantId });
    }

    const [items, total] = await query
      .orderBy('e.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(id: number, tenantId?: number) {
    const query = this.evaluationRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.matiere', 'matiere')
      .leftJoinAndSelect('e.classe', 'classe')
      .leftJoinAndSelect('classe.etablissement', 'etablissement')
      .leftJoinAndSelect('e.niveau', 'niveau')
      .leftJoinAndSelect('e.semestre', 'semestre')
      .leftJoinAndSelect('e.notes', 'notes')
      .leftJoinAndSelect('notes.etudiant', 'etudiant')
      .where('e.id = :id', { id });

    if (tenantId) {
      query.andWhere('etablissement.id = :tenantId', { tenantId });
    }

    const evaluation = await query.getOne();
    if (!evaluation)
      throw new NotFoundException(`Evaluation #${id} non trouvé`);
    return evaluation;
  }

  async update(
    id: number,
    updateEvaluationDto: UpdateEvaluationDto,
    user: any,
    tenantId?: number,
  ) {
    const evaluation = await this.findOne(id, tenantId);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = [evaluation.classe.etablissement.id];
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

  async remove(id: number, user: any, tenantId?: number) {
    const evaluation = await this.findOne(id, tenantId);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = [evaluation.classe.etablissement.id];
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
