import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClasseService } from './classe.service';
import { Classe } from './entities/classe.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

describe('ClasseService', () => {
  let service: ClasseService;

  const mockClasseRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  const mockEtablissementRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
  };

  const mockNiveauRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClasseService,
        {
          provide: getRepositoryToken(Classe),
          useValue: mockClasseRepository,
        },
        {
          provide: getRepositoryToken(Etablissement),
          useValue: mockEtablissementRepository,
        },
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockNiveauRepository,
        },
      ],
    }).compile();

    service = module.get<ClasseService>(ClasseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
