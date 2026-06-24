import { Test, TestingModule } from '@nestjs/testing';
import { EtudiantService } from './etudiant.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Etudiant } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Parent } from '../parent/entities/parent.entity';
import { UserService } from '../user/user.service';
import { ClasseService } from '../classe/classe.service';
import { NiveauService } from '../niveau/niveau.service';
import { DataSource } from 'typeorm';

describe('EtudiantService', () => {
  let service: EtudiantService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserService = {
    create: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
    transaction: jest.fn(),
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
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ClasseService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: NiveauService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<EtudiantService>(EtudiantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
