import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EnseignantService } from './enseignant.service';
import { Enseignant } from './entities/enseignant.entity';
import { Affectation } from './entities/affectation.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

describe('EnseignantService', () => {
  let service: EnseignantService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnseignantService,
        {
          provide: getRepositoryToken(Enseignant),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Affectation),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Matiere),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Etablissement),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EnseignantService>(EnseignantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
