import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';

describe('EvaluationController', () => {
  let controller: EvaluationController;

  const mockRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [
        EvaluationService,
        {
          provide: getRepositoryToken(Evaluation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<EvaluationController>(EvaluationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
