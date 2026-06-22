import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateDevoirDto } from './dto/create-devoir.dto';
import { UpdateDevoirDto } from './dto/update-devoir.dto';
import { Devoir } from './entities/devoir.entity';
import { Submission } from './entities/submission.entity';
import { EnseignantService } from '../enseignant/enseignant.service';
import { Role } from '../user/entities/user.entity';
import { Document } from '../document/entities/document.entity';
import { Classe } from '../classe/entities/classe.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class DevoirService {
  constructor(
    @InjectRepository(Devoir)
    private readonly devoirRepository: Repository<Devoir>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly enseignantService: EnseignantService,
  ) {}

  async create(createDevoirDto: CreateDevoirDto, user: any) {
    const { matiereId, classeId, niveauId, documentIds, ...data } =
      createDevoirDto;

    if (user.role === Role.ENSEIGNANT) {
      const queryRunner =
        this.devoirRepository.manager.connection.createQueryRunner();
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

    let documents: Document[] = [];
    if (documentIds && documentIds.length > 0) {
      documents = await this.documentRepository.findBy({ id: In(documentIds) });
    }

    const devoir = this.devoirRepository.create({
      ...data,
      matiere: { id: matiereId },
      classe: { id: classeId },
      niveau: { id: niveauId },
      enseignant: { id: user.enseignantId || user.id }, // Fallback for admin
      documents,
    });

    return await this.devoirRepository.save(devoir);
  }

  async findAll(paginationQuery: PaginationQueryDto, user?: any) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;
    const tenantId = TenantContext.getTenantId();

    const query = this.devoirRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.matiere', 'matiere')
      .leftJoinAndSelect('d.classe', 'classe')
      .leftJoin('classe.etablissements', 'etablissements')
      .leftJoinAndSelect('d.niveau', 'niveau')
      .leftJoinAndSelect('d.enseignant', 'enseignant')
      .leftJoinAndSelect('d.documents', 'documents');

    if (tenantId) {
      query.andWhere('etablissements.id = :tenantId', { tenantId });
    }

    if (user && user.role === Role.ETUDIANT) {
      const etudiant = (await this.devoirRepository.manager
        .getRepository('Etudiant')
        .findOne({
          where: { id: user.etudiantId },
          relations: { classe: true, niveau: true },
        })) as any;

      if (etudiant) {
        query.andWhere('classe.id = :classeId AND niveau.id = :niveauId', {
          classeId: etudiant.classe.id,
          niveauId: etudiant.niveau.id,
        });
      }
    }

    const [items, total] = await query
      .orderBy('d.deadline', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findByClasse(classeId: number, niveauId: number) {
    const tenantId = TenantContext.getTenantId();
    const where: any = {
      classe: { id: classeId },
      niveau: { id: niveauId },
    };
    if (tenantId) where.classe.etablissements = { id: tenantId };

    return await this.devoirRepository.find({
      where,
      relations: {
        matiere: true,
        enseignant: true,
        documents: true,
      },
      order: { deadline: 'ASC' },
    });
  }

  async findOne(id: number) {
    const tenantId = TenantContext.getTenantId();
    const query = this.devoirRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.matiere', 'matiere')
      .leftJoinAndSelect('d.classe', 'classe')
      .leftJoinAndSelect('classe.etablissements', 'etablissements')
      .leftJoinAndSelect('d.niveau', 'niveau')
      .leftJoinAndSelect('d.enseignant', 'enseignant')
      .leftJoinAndSelect('d.documents', 'documents')
      .where('d.id = :id', { id });

    if (tenantId) {
      query.andWhere('etablissements.id = :tenantId', { tenantId });
    }

    const devoir = await query.getOne();
    if (!devoir) throw new NotFoundException(`Devoir #${id} non trouvé`);
    return devoir;
  }

  async update(id: number, updateDevoirDto: UpdateDevoirDto, user: any) {
    const devoir = await this.findOne(id);

    if (user.role === Role.ENSEIGNANT) {
      if (devoir.enseignant.id !== user.enseignantId) {
        throw new ForbiddenException(
          'Vous ne pouvez modifier que vos propres devoirs',
        );
      }
    }

    const { documentIds, ...data } = updateDevoirDto;
    if (documentIds) {
      devoir.documents = await this.documentRepository.findBy({
        id: In(documentIds),
      });
    }

    Object.assign(devoir, data);
    return await this.devoirRepository.save(devoir);
  }

  async remove(id: number, user: any) {
    const devoir = await this.findOne(id);
    if (
      user.role === Role.ENSEIGNANT &&
      devoir.enseignant.id !== user.enseignantId
    ) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres devoirs',
      );
    }
    return await this.devoirRepository.remove(devoir);
  }

  // --- Submissions ---

  async createSubmission(
    devoirId: number,
    createSubmissionDto: CreateSubmissionDto,
    user: any,
  ) {
    const devoir = await this.findOne(devoirId);

    // 1. Vérifier la deadline
    if (new Date() > new Date(devoir.deadline)) {
      throw new BadRequestException('La date limite est dépassée');
    }

    // 2. Vérifier que l'étudiant appartient à la classe/niveau
    if (user.role === Role.ETUDIANT) {
      const etudiant = (await this.devoirRepository.manager
        .getRepository('Etudiant')
        .findOne({
          where: { id: user.etudiantId },
          relations: { classe: true, niveau: true },
        })) as any;

      if (
        etudiant.classe.id !== devoir.classe.id ||
        etudiant.niveau.id !== devoir.niveau.id
      ) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à soumettre pour ce devoir",
        );
      }
    }

    const { documentId, comment } = createSubmissionDto;

    // 3. Gérer la soumission existante (Update si déjà soumis)
    let submission = await this.submissionRepository.findOne({
      where: { devoir: { id: devoirId }, etudiant: { id: user.etudiantId } },
    });

    if (submission) {
      submission.comment = comment;
      submission.document = { id: documentId } as Document;
    } else {
      submission = this.submissionRepository.create({
        devoir: { id: devoirId },
        etudiant: { id: user.etudiantId },
        document: { id: documentId },
        comment,
      });
    }

    return await this.submissionRepository.save(submission);
  }

  async findAllSubmissions(devoirId: number, user: any) {
    const devoir = await this.findOne(devoirId);

    // Seul l'enseignant du devoir ou un admin peut voir tous les rendus
    if (
      user.role === Role.ENSEIGNANT &&
      devoir.enseignant.id !== user.enseignantId
    ) {
      throw new ForbiddenException("Vous n'êtes pas l'enseignant de ce devoir");
    }

    return await this.submissionRepository.find({
      where: { devoir: { id: devoirId } },
      relations: {
        etudiant: true,
        document: true,
      },
      order: { submittedAt: 'DESC' },
    });
  }

  async findMySubmission(devoirId: number, user: any) {
    const submission = await this.submissionRepository.findOne({
      where: { devoir: { id: devoirId }, etudiant: { id: user.etudiantId } },
      relations: { document: true },
    });
    if (!submission)
      throw new NotFoundException('Aucun rendu trouvé pour ce devoir');
    return submission;
  }

  async removeSubmission(id: number, user: any) {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: { devoir: true, etudiant: true },
    });

    if (!submission) throw new NotFoundException('Rendu introuvable');

    if (submission.etudiant.id !== user.etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que votre propre rendu',
      );
    }

    if (new Date() > new Date(submission.devoir.deadline)) {
      throw new BadRequestException(
        'La date limite est dépassée, suppression impossible',
      );
    }

    return await this.submissionRepository.remove(submission);
  }
}
