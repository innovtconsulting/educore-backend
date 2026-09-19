import { Test, TestingModule } from '@nestjs/testing';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';

describe('PresenceController', () => {
  let controller: PresenceController;

  const mockService = {
    bulkRecord: jest.fn(),
    bulkRecordHalfDay: jest.fn(),
    findBySession: jest.fn(),
    findByHalfDay: jest.fn(),
    getStudentStats: jest.fn(),
    getSessionsSummary: jest.fn(),
    getHalfDaySessionsSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenceController],
      providers: [
        {
          provide: PresenceService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PresenceController>(PresenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
