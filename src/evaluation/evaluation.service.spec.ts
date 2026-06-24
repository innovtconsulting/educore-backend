import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EnseignantService } from '../enseignant/enseignant.service';

describe('EvaluationService', () => {
  let service: EvaluationService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEnseignantService = {
    isResponsibleFor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        {
          provide: EnseignantService,
          useValue: mockEnseignantService,
        },
        {
          provide: getRepositoryToken(Evaluation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
