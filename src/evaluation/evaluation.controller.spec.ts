import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

describe('EvaluationController', () => {
  let controller: EvaluationController;

  const mockEvaluationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [
        {
          provide: EvaluationService,
          useValue: mockEvaluationService,
        },
      ],
    }).compile();

    controller = module.get<EvaluationController>(EvaluationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
