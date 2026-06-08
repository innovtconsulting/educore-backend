import { Test, TestingModule } from '@nestjs/testing';
import { EmploiDuTempsController } from './emploi-du-temps.controller';
import { EmploiDuTempsService } from './emploi-du-temps.service';

describe('EmploiDuTempsController', () => {
  let controller: EmploiDuTempsController;

  const mockEmploiDuTempsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmploiDuTempsController],
      providers: [
        {
          provide: EmploiDuTempsService,
          useValue: mockEmploiDuTempsService,
        },
      ],
    }).compile();

    controller = module.get<EmploiDuTempsController>(EmploiDuTempsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
