import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EtablissementController } from './etablissement.controller';
import { EtablissementService } from './etablissement.service';
import { Etablissement } from './entities/etablissement.entity';

describe('EtablissementController', () => {
  let controller: EtablissementController;

  const mockEtablissementRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtablissementController],
      providers: [
        EtablissementService,
        {
          provide: getRepositoryToken(Etablissement),
          useValue: mockEtablissementRepository,
        },
      ],
    }).compile();

    controller = module.get<EtablissementController>(EtablissementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
