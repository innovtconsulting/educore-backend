import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Document } from './entities/document.entity';
import * as fs from 'fs';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
  ) {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
    return await this.documentRepository.save(document);
  }

  async findAll() {
    return await this.documentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document #${id} non trouvé`);
    }
    return document;
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.findOne(id);
    Object.assign(document, updateDocumentDto);
    return await this.documentRepository.save(document);
  }

  async remove(id: number) {
    const document = await this.findOne(id);
    // Supprimer le fichier physique
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    return await this.documentRepository.remove(document);
  }
}
