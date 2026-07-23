import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmploiDuTempsService } from './emploi-du-temps.service';

function createRepositoryMock() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
    })),
  };
}

describe('EmploiDuTempsService', () => {
  let service: EmploiDuTempsService;
  let emploiRepository: ReturnType<typeof createRepositoryMock>;
  let matiereRepository: ReturnType<typeof createRepositoryMock>;
  let enseignantRepository: ReturnType<typeof createRepositoryMock>;
  let etablissementRepository: ReturnType<typeof createRepositoryMock>;
  let classeRepository: ReturnType<typeof createRepositoryMock>;
  let niveauRepository: ReturnType<typeof createRepositoryMock>;
  let salleRepository: ReturnType<typeof createRepositoryMock>;
  let affectationRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(() => {
    emploiRepository = createRepositoryMock();
    matiereRepository = createRepositoryMock();
    enseignantRepository = createRepositoryMock();
    etablissementRepository = createRepositoryMock();
    classeRepository = createRepositoryMock();
    niveauRepository = createRepositoryMock();
    salleRepository = createRepositoryMock();
    affectationRepository = createRepositoryMock();

    const dataSource = {
      createQueryRunner: jest.fn(),
    } as unknown as DataSource;

    service = new EmploiDuTempsService(
      emploiRepository as any,
      matiereRepository as any,
      enseignantRepository as any,
      etablissementRepository as any,
      classeRepository as any,
      niveauRepository as any,
      salleRepository as any,
      affectationRepository as any,
      dataSource,
    );
  });

  const dto = {
    startTime: '2026-07-24T08:00:00.000Z',
    endTime: '2026-07-24T10:00:00.000Z',
    matiereId: 10,
    enseignantId: 20,
    etablissementId: 30,
    classeId: 40,
    niveauId: 50,
  };

  function mockBaseDependencies() {
    matiereRepository.findOne.mockResolvedValue({
      id: dto.matiereId,
      niveaux: [
        {
          id: dto.niveauId,
          classe: { id: dto.classeId },
        },
      ],
    });
    enseignantRepository.findOneBy.mockResolvedValue({ id: dto.enseignantId });
    etablissementRepository.findOneBy.mockResolvedValue({ id: dto.etablissementId });
    classeRepository.findOneBy.mockResolvedValue({ id: dto.classeId });
    niveauRepository.findOne.mockResolvedValue({
      id: dto.niveauId,
      classe: { id: dto.classeId },
    });
    affectationRepository.findOne.mockResolvedValue({
      id: 1,
      enseignant: { id: dto.enseignantId },
      matiere: { id: dto.matiereId },
      niveau: { id: dto.niveauId },
    });
    emploiRepository.create.mockImplementation((payload) => payload);
    emploiRepository.save.mockImplementation(async (payload) => ({
      id: 99,
      ...payload,
    }));
  }

  it('crée un créneau quand la matière correspond exactement au parcours et au niveau', async () => {
    mockBaseDependencies();

    const result = await service.create(dto as any);

    expect(result.id).toBe(99);
    expect(emploiRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        classe: { id: dto.classeId },
        niveau: { id: dto.niveauId, classe: { id: dto.classeId } },
      }),
    );
  });

  it("rejette la création quand le niveau n'appartient pas au parcours choisi", async () => {
    mockBaseDependencies();
    niveauRepository.findOne.mockResolvedValue({
      id: dto.niveauId,
      classe: { id: 999 },
    });

    await expect(service.create(dto as any)).rejects.toThrow(
      new BadRequestException(
        "Le niveau sélectionné n'appartient pas au parcours choisi",
      ),
    );
  });

  it("rejette la création quand la matière couvre séparément le parcours et le niveau mais pas le couple exact", async () => {
    mockBaseDependencies();
    matiereRepository.findOne.mockResolvedValue({
      id: dto.matiereId,
      niveaux: [
        {
          id: 111,
          classe: { id: dto.classeId },
        },
        {
          id: dto.niveauId,
          classe: { id: 222 },
        },
      ],
    });

    await expect(service.create(dto as any)).rejects.toThrow(
      new BadRequestException(
        "Cette matière n'est pas prévue pour cette classe ou ce niveau",
      ),
    );
  });

  it("rejette la création quand le niveau demandé est introuvable", async () => {
    mockBaseDependencies();
    niveauRepository.findOne.mockResolvedValue(null);

    await expect(service.create(dto as any)).rejects.toThrow(
      new NotFoundException(`Niveau ${dto.niveauId} introuvable`),
    );
  });
});
