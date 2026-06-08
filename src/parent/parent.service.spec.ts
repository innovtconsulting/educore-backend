import { Test, TestingModule } from '@nestjs/testing';
import { ParentService } from './parent.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';

describe('ParentService', () => {
  let service: ParentService;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentService,
        {
          provide: getRepositoryToken(Parent),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ParentService>(ParentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
