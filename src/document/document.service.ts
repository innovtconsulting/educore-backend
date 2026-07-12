import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import * as fs from 'fs';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

interface ScopesInput {
  allEtablissement?: boolean;
  scopes?: { classeId: number; allNiveaux: boolean; niveauIds?: number[] }[];
}

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    private readonly dataSource: DataSource,
  ) {}

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
      // Document non restreint (visible sans filtre de classe/niveau)
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
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    tenantId?: number,
  ) {
    const { allEtablissement, scopes, ...rest } = createDocumentDto;
    const { classes, niveaux } = await this.resolveScopes(
      { allEtablissement, scopes },
      tenantId,
    );

    const document = this.documentRepository.create({
      ...rest,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      etablissement: tenantId ? { id: tenantId } : undefined,
      classes,
      niveaux,
    } as any);
    return await this.documentRepository.save(document);
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    tenantId?: number,
    classeId?: number,
    niveauId?: number,
    category?: string,
  ) {
    const { page = 1, limit = 15, search } = paginationQuery;
    const skip = (page - 1) * limit;

    const baseQb = () => {
      const qb = this.documentRepository.createQueryBuilder('document');
      if (tenantId) {
        qb.andWhere('document.etablissementId = :tenantId', { tenantId });
      }
      if (classeId) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM document_classes "dc" WHERE "dc"."documentId" = document.id AND "dc"."classeId" = :classeId)`,
          { classeId },
        );
      }
      if (niveauId) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM document_niveaux "dn" WHERE "dn"."documentId" = document.id AND "dn"."niveauId" = :niveauId)`,
          { niveauId },
        );
      }
      const categoryList = category
        ? category.split(',').map((c) => c.trim())
        : [];
      if (categoryList.length > 0) {
        qb.andWhere('document.category IN (:...categoryList)', {
          categoryList,
        });
      }
      if (search) {
        qb.andWhere(
          new Brackets((qb2) => {
            qb2
              .where('document.title ILIKE :search', {
                search: `%${search}%`,
              })
              .orWhere('document.description ILIKE :search', {
                search: `%${search}%`,
              });
          }),
        );
      }
      return qb;
    };

    const total = await baseQb().getCount();
    const idRows = await baseQb()
      .select('document.id', 'id')
      .orderBy('document.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();
    const ids = idRows.map((r) => Number(r.id));

    const items = ids.length
      ? await this.documentRepository.find({
          where: { id: In(ids) },
          relations: { classes: true, niveaux: true },
        })
      : [];
    const itemsById = new Map(items.map((d) => [d.id, d]));
    const orderedItems = ids
      .map((id) => itemsById.get(id))
      .filter((d): d is Document => !!d);

    return {
      items: orderedItems,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, tenantId?: number) {
    const where: any = { id };
    if (tenantId) where.etablissementId = tenantId;

    const document = await this.documentRepository.findOne({
      where,
      relations: { classes: true, niveaux: true },
    });
    if (!document) {
      throw new NotFoundException(`Document #${id} non trouvé`);
    }
    return document;
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    tenantId?: number,
  ) {
    const document = await this.findOne(id, tenantId);

    // Si deleteFile est true, supprimer le fichier physique
    if (updateDocumentDto.deleteFile && document.filePath) {
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
      document.filePath = undefined as any;
      document.originalName = undefined as any;
      document.mimeType = undefined as any;
      document.fileSize = undefined as any;
    }

    const { deleteFile, allEtablissement, scopes, ...otherFields } =
      updateDocumentDto;

    if (allEtablissement !== undefined || scopes !== undefined) {
      const { classes, niveaux } = await this.resolveScopes(
        { allEtablissement, scopes },
        tenantId,
      );
      document.classes = classes;
      document.niveaux = niveaux;
    }

    Object.assign(document, otherFields);

    return await this.documentRepository.save(document);
  }

  async remove(id: number, tenantId?: number) {
    const document = await this.findOne(id, tenantId);

    // Vérifier si le document est utilisé dans des soumissions
    const submissionRepo = this.dataSource.getRepository('Submission');
    const submissions = await submissionRepo
      .createQueryBuilder('submission')
      .leftJoin('submission.document', 'document')
      .where('document.id = :id', { id })
      .getMany();

    if (submissions.length > 0) {
      // Supprimer le fichier physique
      if (document.filePath && fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      // Mettre à jour les soumissions pour retirer la référence au document
      for (const submission of submissions) {
        submission.document = undefined as any;
        await submissionRepo.save(submission);
      }
    } else {
      // Supprimer le fichier physique
      if (document.filePath && fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    }

    return await this.documentRepository.remove(document);
  }
}
