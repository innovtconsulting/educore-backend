import { Test, TestingModule } from '@nestjs/testing';
import { InscriptionController } from './inscription.controller';
import { InscriptionService } from './inscription.service';

describe('InscriptionController', () => {
  let controller: InscriptionController;

  const mockInscriptionService = {
    reinscrire: jest.fn(),
    graduate: jest.fn(),
    getGraduatesReport: jest.fn(),
    checkEligibility: jest.fn(),
    getHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InscriptionController],
      providers: [
        {
          provide: InscriptionService,
          useValue: mockInscriptionService,
        },
      ],
    }).compile();

    controller = module.get<InscriptionController>(InscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
