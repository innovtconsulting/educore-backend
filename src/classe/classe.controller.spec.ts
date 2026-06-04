import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClasseController } from './classe.controller';
import { ClasseService } from './classe.service';
import { Classe } from './entities/classe.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';

describe('ClasseController', () => {
  let controller: ClasseController;

  const mockClasseService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClasseController],
      providers: [
        {
          provide: ClasseService,
          useValue: mockClasseService,
        },
      ],
    }).compile();

    controller = module.get<ClasseController>(ClasseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
