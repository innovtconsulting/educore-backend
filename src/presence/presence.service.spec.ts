import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Presence } from './entities/presence.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';

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
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
