import { Test, TestingModule } from '@nestjs/testing';
import { SalleController } from './salle.controller';
import { SalleService } from './salle.service';

describe('SalleController', () => {
  let controller: SalleController;

  const mockSalleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalleController],
      providers: [
        {
          provide: SalleService,
          useValue: mockSalleService,
        },
      ],
    }).compile();

    controller = module.get<SalleController>(SalleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
