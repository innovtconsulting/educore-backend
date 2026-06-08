import { Test, TestingModule } from '@nestjs/testing';
import { EtudiantService } from './etudiant.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Etudiant } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Parent } from '../parent/entities/parent.entity';

describe('EtudiantService', () => {
  let service: EtudiantService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtudiantService,
        {
          provide: getRepositoryToken(Etudiant),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Etablissement),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Classe),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Parent),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EtudiantService>(EtudiantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
