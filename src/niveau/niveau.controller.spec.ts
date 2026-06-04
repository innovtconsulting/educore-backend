import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NiveauController } from './niveau.controller';
import { NiveauService } from './niveau.service';
import { Niveau } from './entities/niveau.entity';

describe('NiveauController', () => {
  let controller: NiveauController;

  const mockNiveauRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NiveauController],
      providers: [
        NiveauService,
        {
          provide: getRepositoryToken(Niveau),
          useValue: mockNiveauRepository,
        },
      ],
    }).compile();

    controller = module.get<NiveauController>(NiveauController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
