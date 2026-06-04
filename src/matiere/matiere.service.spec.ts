import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatiereService } from './matiere.service';
import { Matiere } from './entities/matiere.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

describe('MatiereService', () => {
  let service: MatiereService;

  const mockMatiereRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  const mockClasseRepository = {
    findBy: jest.fn(),
  };

  const mockNiveauRepository = {
    findBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatiereService,
        {
          provide: getRepositoryToken(Matiere),
          useValue: mockMatiereRepository,
        },
        {
          provide: getRepositoryToken(Classe),
          useValue: mockClasseRepository,
        },
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockNiveauRepository,
        },
      ],
    }).compile();

    service = module.get<MatiereService>(MatiereService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
