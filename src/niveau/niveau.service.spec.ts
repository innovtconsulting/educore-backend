import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NiveauService } from './niveau.service';
import { Niveau } from './entities/niveau.entity';

describe('NiveauService', () => {
  let service: NiveauService;

  const mockNiveauRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NiveauService,
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockNiveauRepository,
        },
      ],
    }).compile();

    service = module.get<NiveauService>(NiveauService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
