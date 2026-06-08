import { Test, TestingModule } from '@nestjs/testing';
import { EtudiantController } from './etudiant.controller';
import { EtudiantService } from './etudiant.service';

describe('EtudiantController', () => {
  let controller: EtudiantController;

  const mockEtudiantService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateProfilePicture: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtudiantController],
      providers: [
        {
          provide: EtudiantService,
          useValue: mockEtudiantService,
        },
      ],
    }).compile();

    controller = module.get<EtudiantController>(EtudiantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
