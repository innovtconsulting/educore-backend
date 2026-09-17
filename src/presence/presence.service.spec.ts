import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Presence } from './entities/presence.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { ParentService } from '../parent/parent.service';

describe('PresenceService', () => {
  let service: PresenceService;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: getRepositoryToken(Presence),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(EmploiDuTemp),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(Etudiant),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(Classe),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockRepo,
        },
        {
          provide: ParentService,
          useValue: { assertParentOfEtudiant: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
