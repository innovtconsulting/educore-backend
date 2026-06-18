import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from './document.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Document, DocumentCategory } from './entities/document.entity';
import * as fs from 'fs';

jest.mock('fs');

describe('DocumentService', () => {
  let service: DocumentService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a document', async () => {
      const dto = {
        title: 'Test',
        description: 'Desc',
        category: DocumentCategory.ADMINISTRATIF,
      };
      const file = {
        path: 'uploads/documents/test.pdf',
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const expectedDoc = { id: 1, ...dto, filePath: file.path };
      mockRepository.create.mockReturnValue(expectedDoc);
      mockRepository.save.mockResolvedValue(expectedDoc);

      const result = await service.create(dto, file);

      expect(mockRepository.create).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        category: dto.category,
        filePath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expectedDoc);
    });
  });

  describe('remove', () => {
    it('should remove document and delete physical file', async () => {
      const doc = { id: 1, filePath: 'path/to/file.pdf' };
      mockRepository.findOne.mockResolvedValue(doc);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalledWith(doc);
      expect(fs.unlinkSync).toHaveBeenCalledWith(doc.filePath);
    });

    it('should not try to delete file if it does not exist', async () => {
      const doc = { id: 1, filePath: 'non/existent.pdf' };
      mockRepository.findOne.mockResolvedValue(doc);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
