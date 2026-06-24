import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmploiDuTempsService } from './emploi-du-temps.service';
import { EmploiDuTemp } from './entities/emploi-du-temp.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Salle } from '../salle/entities/salle.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';

describe('EmploiDuTempsService', () => {
  let service: EmploiDuTempsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmploiDuTempsService,
        {
          provide: getRepositoryToken(EmploiDuTemp),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Matiere),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Enseignant),
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
          provide: getRepositoryToken(Salle),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Affectation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmploiDuTempsService>(EmploiDuTempsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
