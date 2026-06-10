import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';

describe('EvaluationService', () => {
  let service: EvaluationService;

  const mockRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
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
