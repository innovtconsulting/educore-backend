import { Test, TestingModule } from '@nestjs/testing';
import { MatiereController } from './matiere.controller';
import { MatiereService } from './matiere.service';

describe('MatiereController', () => {
  let controller: MatiereController;

  const mockMatiereService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatiereController],
      providers: [
        {
          provide: MatiereService,
          useValue: mockMatiereService,
        },
      ],
    }).compile();

    controller = module.get<MatiereController>(MatiereController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
