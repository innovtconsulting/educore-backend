import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EtablissementService } from './etablissement.service';
import { Etablissement } from './entities/etablissement.entity';

describe('EtablissementService', () => {
  let service: EtablissementService;

  const mockEtablissementRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtablissementService,
        {
          provide: getRepositoryToken(Etablissement),
          useValue: mockEtablissementRepository,
        },
      ],
    }).compile();

    service = module.get<EtablissementService>(EtablissementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
