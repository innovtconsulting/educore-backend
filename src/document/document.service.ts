import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere, DataSource } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';
import * as fs from 'fs';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    tenantId?: number,
  ) {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      etablissement: tenantId ? { id: tenantId } : undefined,
    });
    return await this.documentRepository.save(document);
  }

  async findAll(paginationQuery: PaginationQueryDto, tenantId?: number) {
    const { page = 1, limit = 15, search } = paginationQuery;
    const skip = (page - 1) * limit;

    let where: FindOptionsWhere<Document> | FindOptionsWhere<Document>[] = [];
    if (search) {
      where = [
        { title: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
      ];
    } else {
      where = {};
    }

    where = TenantHelper.addTenantFilter(where, tenantId);

    const [items, total] = await this.documentRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, tenantId?: number) {
    const where = TenantHelper.addTenantFilter({ id }, tenantId);

    const document = await this.documentRepository.findOne({ where });
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

    // Mettre à jour les autres champs
    const { deleteFile, ...otherFields } = updateDocumentDto;
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
