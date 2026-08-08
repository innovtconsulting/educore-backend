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
import { Niveau } from '../niveau/entities/niveau.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';

interface ScopesInput {
  allEtablissement?: boolean;
  scopes?: { classeId: number; allNiveaux: boolean; niveauIds?: number[] }[];
}

@Injectable()
export class DevoirService {
  constructor(
    @InjectRepository(Devoir)
    private readonly devoirRepository: Repository<Devoir>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    private readonly enseignantService: EnseignantService,
  ) {}

  // Résolution des cibles (classes/niveaux) d'un devoir — même logique que
  // DocumentService.resolveScopes : ensembles à plat, "Tout l'établissement"
  // résolu en la liste explicite de toutes les classes/niveaux du tenant.
  private async resolveScopes(
    dto: ScopesInput,
    tenantId?: number,
  ): Promise<{ classes: Classe[]; niveaux: Niveau[] }> {
    const classesMap = new Map<number, Classe>();
    const niveauxMap = new Map<number, Niveau>();

    if (dto.allEtablissement) {
      const where: any = {};
      if (tenantId) where.etablissement = { id: tenantId };
      const classes = await this.classeRepository.find({
        where,
        relations: { niveaux: true },
      });
      for (const classe of classes) {
        classesMap.set(classe.id, classe);
        for (const niveau of classe.niveaux ?? []) niveauxMap.set(niveau.id, niveau);
      }
      return { classes: [...classesMap.values()], niveaux: [...niveauxMap.values()] };
    }

    if (!dto.scopes || dto.scopes.length === 0) {
      return { classes: [], niveaux: [] };
    }

    for (const scope of dto.scopes) {
      const where: any = { id: scope.classeId };
      if (tenantId) where.etablissement = { id: tenantId };
      const classe = await this.classeRepository.findOne({
        where,
        relations: { niveaux: true },
      });
      if (!classe) {
        throw new NotFoundException(`Parcours #${scope.classeId} introuvable`);
      }
      classesMap.set(classe.id, classe);

      let niveaux: Niveau[];
      if (scope.allNiveaux) {
        niveaux = classe.niveaux ?? [];
      } else {
        const requestedIds = scope.niveauIds ?? [];
        niveaux = (classe.niveaux ?? []).filter((n) =>
          requestedIds.includes(n.id),
        );
        if (niveaux.length !== requestedIds.length) {
          throw new BadRequestException(
            `Un ou plusieurs niveaux sélectionnés n'appartiennent pas au parcours "${classe.name}"`,
          );
        }
      }
      for (const niveau of niveaux) niveauxMap.set(niveau.id, niveau);
    }

    return { classes: [...classesMap.values()], niveaux: [...niveauxMap.values()] };
  }

  async create(
    createDevoirDto: CreateDevoirDto,
    user: any,
    tenantId?: number,
  ) {
    const { matiereId, allEtablissement, scopes, documentIds, ...data } =
      createDevoirDto;

    const { classes, niveaux } = await this.resolveScopes(
      { allEtablissement, scopes },
      tenantId,
    );

    if (niveaux.length === 0) {
      throw new BadRequestException(
        'Sélectionnez au moins un parcours/niveau ou activez "Tout l\'établissement"',
      );
    }

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = [tenantId || user.etablissementId];
      for (const niveau of niveaux) {
        const isResponsible = await this.enseignantService.isResponsibleFor(
          user.enseignantId,
          matiereId,
          niveau.id,
          etablissementIds,
        );
        if (!isResponsible) {
          throw new ForbiddenException(
            `Vous n'êtes pas responsable de cette matière pour le niveau "${niveau.name}" dans cet établissement`,
          );
        }
      }
    }

    let documents: Document[] = [];
    if (documentIds && documentIds.length > 0) {
      documents = await this.documentRepository.findBy({ id: In(documentIds) });
    }

    const devoir = this.devoirRepository.create({
      ...data,
      matiere: { id: matiereId },
      classes,
      niveaux,
      enseignant: { id: user.enseignantId || user.id },
      etablissement: { id: tenantId || user.etablissementId },
      documents,
    });

    return await this.devoirRepository.save(devoir);
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    user?: any,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const baseQb = async () => {
      const qb = this.devoirRepository
        .createQueryBuilder('d')
        .leftJoin('d.etablissement', 'etablissement');

      if (tenantId) {
        qb.andWhere('etablissement.id = :tenantId', { tenantId });
      }

      if (user && user.role === Role.ETUDIANT) {
        const etudiant = (await this.devoirRepository.manager
          .getRepository('Etudiant')
          .findOne({
            where: { id: user.etudiantId },
            relations: { classe: true, niveau: true },
          })) as any;

        if (etudiant) {
          qb.andWhere(
            `EXISTS (SELECT 1 FROM devoir_niveaux "dn" WHERE "dn"."devoirId" = d.id AND "dn"."niveauId" = :niveauId)`,
            { niveauId: etudiant.niveau.id },
          );
          if (etudiant.classe?.id) {
            qb.andWhere(
              `EXISTS (SELECT 1 FROM devoir_classes "dc" WHERE "dc"."devoirId" = d.id AND "dc"."classeId" = :classeId)`,
              { classeId: etudiant.classe.id },
            );
          }
        }
      }

      return qb;
    };

    const total = await (await baseQb()).getCount();
    const idRows = await (await baseQb())
      .select('d.id', 'id')
      .orderBy('d.deadline', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();
    const ids = idRows.map((r) => Number(r.id));

    const items = ids.length
      ? await this.devoirRepository.find({
          where: { id: In(ids) },
          relations: {
            matiere: true,
            classes: true,
            niveaux: true,
            enseignant: true,
            documents: true,
          },
          order: { deadline: 'ASC' },
        })
      : [];
    const itemsById = new Map(items.map((d) => [d.id, d]));
    const orderedItems = ids
      .map((id) => itemsById.get(id))
      .filter((d): d is Devoir => !!d);

    return {
      items: orderedItems,
      total,
      page,
      limit,
    };
  }

  async findByTeacher(
    enseignantId?: number,
    paginationQuery?: PaginationQueryDto,
    tenantId?: number,
    classeId?: number,
    niveauId?: number,
  ) {
    const { page = 1, limit = 15, search } = paginationQuery ?? {};
    const skip = (page - 1) * limit;

    const baseQb = () => {
      const qb = this.devoirRepository
        .createQueryBuilder('d')
        .leftJoin('d.enseignant', 'enseignant')
        .leftJoin('d.etablissement', 'etablissement');

      if (enseignantId) {
        qb.andWhere('enseignant.id = :enseignantId', { enseignantId });
      }

      qb.andWhere(tenantId ? 'etablissement.id = :tenantId' : '1=1', {
        tenantId,
      });

      if (search) {
        qb.andWhere('(d.title ILIKE :search OR d.description ILIKE :search)', {
          search: `%${search}%`,
        });
      }

      if (classeId) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM devoir_classes "dc" WHERE "dc"."devoirId" = d.id AND "dc"."classeId" = :classeId)`,
          { classeId },
        );
      }

      if (niveauId) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM devoir_niveaux "dn" WHERE "dn"."devoirId" = d.id AND "dn"."niveauId" = :niveauId)`,
          { niveauId },
        );
      }

      return qb;
    };

    const total = await baseQb().getCount();
    const idRows = await baseQb()
      .select('d.id', 'id')
      .orderBy('d.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();
    const ids = idRows.map((r) => Number(r.id));

    const items = ids.length
      ? await this.devoirRepository.find({
          where: { id: In(ids) },
          relations: {
            matiere: true,
            classes: true,
            niveaux: true,
            etablissement: true,
            enseignant: true,
            documents: true,
          },
          order: { createdAt: 'DESC' },
        })
      : [];
    const itemsById = new Map(items.map((d) => [d.id, d]));
    const orderedItems = ids
      .map((id) => itemsById.get(id))
      .filter((d): d is Devoir => !!d);

    return { items: orderedItems, total, page, limit };
  }

  async findByClasse(classeId: number, niveauId: number, tenantId?: number) {
    const qb = this.devoirRepository
      .createQueryBuilder('d')
      .leftJoin('d.etablissement', 'etablissement')
      .andWhere(
        `EXISTS (SELECT 1 FROM devoir_classes "dc" WHERE "dc"."devoirId" = d.id AND "dc"."classeId" = :classeId)`,
        { classeId },
      )
      .andWhere(
        `EXISTS (SELECT 1 FROM devoir_niveaux "dn" WHERE "dn"."devoirId" = d.id AND "dn"."niveauId" = :niveauId)`,
        { niveauId },
      );

    if (tenantId) {
      qb.andWhere('etablissement.id = :tenantId', { tenantId });
    }

    const ids = (await qb.select('d.id', 'id').getRawMany()).map((r) =>
      Number(r.id),
    );
    if (ids.length === 0) return [];

    return await this.devoirRepository.find({
      where: { id: In(ids) },
      relations: {
        matiere: true,
        classes: true,
        niveaux: true,
        etablissement: true,
        enseignant: true,
        documents: true,
      },
      order: { deadline: 'ASC' },
    });
  }

  async findOne(id: number, tenantId?: number) {
    const query = this.devoirRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.matiere', 'matiere')
      .leftJoinAndSelect('d.classes', 'classes')
      .leftJoinAndSelect('d.niveaux', 'niveaux')
      .leftJoinAndSelect('d.etablissement', 'etablissement')
      .leftJoinAndSelect('d.enseignant', 'enseignant')
      .leftJoinAndSelect('d.documents', 'documents')
      .where('d.id = :id', { id });

    if (tenantId) {
      query.andWhere('etablissement.id = :tenantId', { tenantId });
    }

    const devoir = await query.getOne();
    if (!devoir) throw new NotFoundException(`Devoir #${id} non trouvé`);
    return devoir;
  }

  async update(
    id: number,
    updateDevoirDto: UpdateDevoirDto,
    user: any,
    tenantId?: number,
  ) {
    const devoir = await this.findOne(id, tenantId);

    if (user.role === Role.ENSEIGNANT) {
      if (devoir.enseignant.id !== user.enseignantId) {
        throw new ForbiddenException(
          'Vous ne pouvez modifier que vos propres devoirs',
        );
      }
    }

    const { documentIds, allEtablissement, scopes, ...data } = updateDevoirDto;
    if (documentIds) {
      devoir.documents = await this.documentRepository.findBy({
        id: In(documentIds),
      });
    }

    if (allEtablissement !== undefined || scopes !== undefined) {
      const { classes, niveaux } = await this.resolveScopes(
        { allEtablissement, scopes },
        tenantId,
      );
      if (niveaux.length === 0) {
        throw new BadRequestException(
          'Sélectionnez au moins un parcours/niveau ou activez "Tout l\'établissement"',
        );
      }
      devoir.classes = classes;
      devoir.niveaux = niveaux;
    }

    Object.assign(devoir, data);
    return await this.devoirRepository.save(devoir);
  }

  async remove(id: number, user: any, tenantId?: number) {
    const devoir = await this.findOne(id, tenantId);
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

    // 2. Vérifier que l'étudiant appartient à une classe/niveau ciblé
    if (user.role === Role.ETUDIANT) {
      const etudiant = (await this.devoirRepository.manager
        .getRepository('Etudiant')
        .findOne({
          where: { id: user.etudiantId },
          relations: { classe: true, niveau: true },
        })) as any;

      const classeIds = (devoir.classes ?? []).map((c) => c.id);
      const niveauIds = (devoir.niveaux ?? []).map((n) => n.id);
      const classMatch = classeIds.includes(etudiant.classe?.id);
      const niveauMatch = niveauIds.includes(etudiant.niveau?.id);
      if (!classMatch || !niveauMatch) {
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
        etablissement: { id: devoir.etablissement.id },
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
