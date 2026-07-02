import {
  BadRequestException,
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
import { Note } from '../note/entities/note.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    private readonly enseignantService: EnseignantService,
  ) {}

  async create(
    createEvaluationDto: CreateEvaluationDto,
    user: any,
    tenantId?: number,
  ) {
    const {
      matiereId,
      classeId,
      niveauId,
      semestreId,
      titre,
      coefficient,
      dateEvaluation,
      ...data
    } = createEvaluationDto;
    const title = data.title || titre;
    const weight = data.weight ?? coefficient ?? 1;
    const date = data.date || dateEvaluation;

    if (!title) throw new BadRequestException('Le titre est obligatoire');
    if (!date) {
      throw new BadRequestException("La date d'évaluation est obligatoire");
    }

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
      title,
      weight,
      date,
      matiere: { id: matiereId },
      classe: { id: classeId },
      niveau: { id: niveauId },
      semestre: { id: semestreId },
      etablissement: { id: tenantId },
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

  async findForTeacher(
    enseignantId: number,
    classeId?: number,
    niveauId?: number,
    tenantId?: number,
  ) {
    const matiereIds =
      await this.enseignantService.getMatiereIdsByEnseignant(enseignantId);
    if (matiereIds.length === 0) return [];

    const query = this.evaluationRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.matiere', 'matiere')
      .leftJoinAndSelect('e.classe', 'classe')
      .leftJoinAndSelect('classe.etablissement', 'etablissement')
      .leftJoinAndSelect('e.niveau', 'niveau')
      .leftJoinAndSelect('e.semestre', 'semestre')
      .where('matiere.id IN (:...matiereIds)', { matiereIds });

    if (classeId) query.andWhere('classe.id = :classeId', { classeId });
    if (niveauId) query.andWhere('niveau.id = :niveauId', { niveauId });
    if (tenantId) query.andWhere('etablissement.id = :tenantId', { tenantId });

    return query.orderBy('e.id', 'DESC').getMany();
  }

  async findMyStudentEvaluations(user: any, tenantId?: number) {
    if (!user.etudiantId) {
      throw new ForbiddenException('Profil étudiant introuvable');
    }

    return this.getStudentEvaluationSummary(user.etudiantId, user, tenantId);
  }

  async getStudentEvaluationSummary(
    etudiantId: number,
    user: any,
    tenantId?: number,
  ) {
    const etudiant = await this.assertCanReadStudent(
      etudiantId,
      user,
      tenantId,
    );
    const notes = await this.findStudentNotes(etudiantId);

    return this.buildStudentSummary(etudiant, notes);
  }

  async getStudentBulletinSummary(
    etudiantId: number,
    user: any,
    tenantId?: number,
  ) {
    return this.getStudentEvaluationSummary(etudiantId, user, tenantId);
  }

  private async assertCanReadStudent(
    etudiantId: number,
    user: any,
    tenantId?: number,
  ) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: {
        classe: true,
        niveau: true,
        etablissement: true,
        parents: true,
      },
    });

    if (!etudiant) throw new NotFoundException('Étudiant introuvable');

    const effectiveTenantId = tenantId || user.etablissementId;
    if (
      user.role !== Role.SUPER_ADMIN &&
      effectiveTenantId &&
      etudiant.etablissement?.id !== effectiveTenantId
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à consulter cet étudiant",
      );
    }

    if (user.role === Role.ETUDIANT && etudiant.id !== user.etudiantId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à consulter ces notes",
      );
    }

    if (
      user.role === Role.PARENT &&
      !etudiant.parents?.some((parent) => parent.id === user.parentId)
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à consulter les notes de cet étudiant",
      );
    }

    return etudiant;
  }

  private async findStudentNotes(etudiantId: number) {
    const notes = await this.noteRepository.find({
      where: {
        etudiant: { id: etudiantId },
      },
      relations: {
        evaluation: {
          matiere: true,
          classe: true,
          niveau: true,
          semestre: true,
        },
      },
      order: {
        id: 'DESC',
      },
    });

    return notes.sort((a, b) => {
      const dateA = a.evaluation?.date
        ? new Date(a.evaluation.date).getTime()
        : 0;
      const dateB = b.evaluation?.date
        ? new Date(b.evaluation.date).getTime()
        : 0;
      return dateB - dateA;
    });
  }

  private buildStudentSummary(etudiant: Etudiant, notes: Note[]) {
    const passingGrade = 10;
    const matiereMap = new Map<number, any>();

    notes.forEach((note) => {
      const evaluation = note.evaluation;
      const matiere = evaluation?.matiere;
      if (!evaluation || !matiere) return;

      const matiereId = matiere.id;
      const noteValue = Number(note.value || 0);
      const evaluationWeight = Number(evaluation.weight || 1);

      if (!matiereMap.has(matiereId)) {
        matiereMap.set(matiereId, {
          matiere: {
            id: matiere.id,
            code: matiere.code,
            name: matiere.name,
            coefficient: Number(matiere.coefficient || 1),
          },
          total: 0,
          weightTotal: 0,
          notes: [],
        });
      }

      const group = matiereMap.get(matiereId);
      group.total += noteValue * evaluationWeight;
      group.weightTotal += evaluationWeight;
      group.notes.push({
        id: note.id,
        noteSur20: noteValue,
        value: noteValue,
        observation: note.remark || null,
        remark: note.remark || null,
        evaluation: {
          id: evaluation.id,
          titre: evaluation.title,
          title: evaluation.title,
          type: this.normalizeEvaluationType(evaluation.type),
          typeOriginal: evaluation.type,
          session: evaluation.session,
          coefficient: evaluationWeight,
          weight: evaluationWeight,
          dateEvaluation: evaluation.date,
          date: evaluation.date,
          matiere: {
            id: matiere.id,
            code: matiere.code,
            name: matiere.name,
          },
          classe: evaluation.classe
            ? { id: evaluation.classe.id, name: evaluation.classe.name }
            : null,
          niveau: evaluation.niveau
            ? { id: evaluation.niveau.id, name: evaluation.niveau.name }
            : null,
          semestre: evaluation.semestre
            ? { id: evaluation.semestre.id, name: evaluation.semestre.name }
            : null,
        },
      });
    });

    const matieres = Array.from(matiereMap.values()).map((group) => {
      const moyenne =
        group.weightTotal > 0 ? group.total / group.weightTotal : 0;
      return {
        matiere: group.matiere,
        coefficient: group.matiere.coefficient,
        moyenne: Number(moyenne.toFixed(2)),
        average: Number(moyenne.toFixed(2)),
        notes: group.notes,
      };
    });

    const totalCoefficients = matieres.reduce(
      (sum, item) => sum + Number(item.coefficient || 1),
      0,
    );
    const totalWeighted = matieres.reduce(
      (sum, item) => sum + item.moyenne * Number(item.coefficient || 1),
      0,
    );
    const moyenneGenerale =
      totalCoefficients > 0 ? totalWeighted / totalCoefficients : 0;
    const roundedAverage = Number(moyenneGenerale.toFixed(2));
    const isAdmis = roundedAverage >= passingGrade;

    return {
      etudiant: {
        id: etudiant.id,
        firstName: etudiant.firstName,
        lastName: etudiant.lastName,
        nom: `${etudiant.lastName} ${etudiant.firstName}`,
        fullName: `${etudiant.firstName} ${etudiant.lastName}`,
        matricule: etudiant.matricule,
        classe: etudiant.classe
          ? { id: etudiant.classe.id, name: etudiant.classe.name }
          : null,
        niveau: etudiant.niveau
          ? { id: etudiant.niveau.id, name: etudiant.niveau.name }
          : null,
      },
      matieres,
      notes: matieres.flatMap((matiere) => matiere.notes),
      moyenneGenerale: roundedAverage,
      generalAverage: roundedAverage,
      seuilAdmission: passingGrade,
      statut: isAdmis ? 'admis' : 'ajourne',
      decision: {
        isAdmis,
        statut: isAdmis ? 'admis' : 'ajourne',
        label: isAdmis ? 'Admis' : 'Ajourné',
        seuil: passingGrade,
      },
    };
  }

  private normalizeEvaluationType(type: string) {
    if (type === 'Contrôle Continu') return 'CONTROLE';
    if (type === 'Examen') return 'EXAMEN';
    if (type === 'Projet') return 'DEVOIR';
    return type;
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
