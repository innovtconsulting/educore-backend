import { Test, TestingModule } from '@nestjs/testing';
import { SalleService } from './salle.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Salle } from './entities/salle.entity';

describe('SalleService', () => {
  let service: SalleService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalleService,
        {
          provide: getRepositoryToken(Salle),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SalleService>(SalleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
