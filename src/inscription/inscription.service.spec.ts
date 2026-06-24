import { Test, TestingModule } from '@nestjs/testing';
import { InscriptionService } from './inscription.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Inscription } from '../etudiant/entities/inscription.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Facture } from '../finance/entities/facture.entity';
import { Frais } from '../finance/entities/frais.entity';
import { BulletinService } from '../bulletin/bulletin.service';
import { GlobalSettingService } from '../global-setting/global-setting.service';
import { DataSource } from 'typeorm';

describe('InscriptionService', () => {
  let service: InscriptionService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InscriptionService,
        { provide: getRepositoryToken(Inscription), useValue: mockRepository },
        { provide: getRepositoryToken(Etudiant), useValue: mockRepository },
        { provide: getRepositoryToken(AnneeUniversitaire), useValue: mockRepository },
        { provide: getRepositoryToken(Classe), useValue: mockRepository },
        { provide: getRepositoryToken(Niveau), useValue: mockRepository },
        { provide: getRepositoryToken(Facture), useValue: mockRepository },
        { provide: getRepositoryToken(Frais), useValue: mockRepository },
        {
          provide: BulletinService,
          useValue: {
            generateBulletin: jest.fn(),
          },
        },
        {
          provide: GlobalSettingService,
          useValue: {
            getValue: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InscriptionService>(InscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
