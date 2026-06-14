import { Test, TestingModule } from '@nestjs/testing';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { describe, beforeEach, it } from 'node:test';

describe('ParentController', () => {
  let controller: ParentController;

  const mockParentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentController],
      providers: [
        {
          provide: ParentService,
          useValue: mockParentService,
        },
      ],
    }).compile();

    controller = module.get<ParentController>(ParentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
