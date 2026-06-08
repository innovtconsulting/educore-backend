import { Test, TestingModule } from '@nestjs/testing';
import { EnseignantController } from './enseignant.controller';
import { EnseignantService } from './enseignant.service';

describe('EnseignantController', () => {
  let controller: EnseignantController;

  const mockEnseignantService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addAffectation: jest.fn(),
    removeAffectation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnseignantController],
      providers: [
        {
          provide: EnseignantService,
          useValue: mockEnseignantService,
        },
      ],
    }).compile();

    controller = module.get<EnseignantController>(EnseignantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
