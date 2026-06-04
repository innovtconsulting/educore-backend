import { Test, TestingModule } from '@nestjs/testing';
import { MatiereController } from './matiere.controller';
import { MatiereService } from './matiere.service';

describe('MatiereController', () => {
  let controller: MatiereController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatiereController],
      providers: [MatiereService],
    }).compile();

    controller = module.get<MatiereController>(MatiereController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
