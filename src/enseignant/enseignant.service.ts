import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, DataSource } from 'typeorm';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { Enseignant } from './entities/enseignant.entity';
import { Affectation } from './entities/affectation.entity';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { EnseignantFilterDto } from './dto/enseignant-filter.dto';
import { UserService } from '../user/user.service';
import { Role } from '../user/entities/user.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class EnseignantService {
  constructor(
    @InjectRepository(Enseignant)
    private readonly enseignantRepository: Repository<Enseignant>,
    @InjectRepository(Affectation)
    private readonly affectationRepository: Repository<Affectation>,
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createEnseignantDto: CreateEnseignantDto,
    tenantId?: number,
  ): Promise<Enseignant> {
    const {
      email: rawEmail,
      matricule,
      etablissementId: dtoEtablissementId,
    } = createEnseignantDto;

    const email = rawEmail.toLowerCase().trim();

    const existingEmail = await this.enseignantRepository.findOne({ where: { email: ILike(email) } });
    if (existingEmail) {
      throw new BadRequestException(
        `Un enseignant avec l'email "${email}" existe déjà`,
      );
    }

    const existingMatricule = await this.enseignantRepository.findOneBy({
      matricule,
    });
    if (existingMatricule) {
      throw new BadRequestException(
        `Un enseignant avec le matricule "${matricule}" existe déjà`,
      );
    }

    const finalEtablissementId = tenantId || dtoEtablissementId;
    if (!finalEtablissementId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    const etablissement = await this.etablissementRepository.findOneBy({
      id: finalEtablissementId,
    });
    if (!etablissement) {
      throw new NotFoundException(
        `Établissement avec l'ID "${finalEtablissementId}" introuvable`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enseignant = queryRunner.manager.create(Enseignant, {
        ...createEnseignantDto,
        email,
        etablissement,
        etablissementId: finalEtablissementId,
      });
      const savedEnseignant = await queryRunner.manager.save(Enseignant, enseignant);

      await this.userService.createWithRunner(queryRunner, {
        email,
        username: createEnseignantDto.firstName,
        password: '12345678',
        role: Role.ENSEIGNANT,
        enseignant: savedEnseignant,
        etablissement,
        etablissementId: finalEtablissementId,
        isActive: true,
      });

      await queryRunner.commitTransaction();
      return savedEnseignant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filter: EnseignantFilterDto, tenantId?: number) {
    const {
      page = 1,
      limit = 20,
      search,
      etablissementId,
      matiereId,
      niveauId,
    } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.enseignantRepository
      .createQueryBuilder('enseignant')
      .leftJoinAndSelect('enseignant.affectations', 'affectations')
      .leftJoinAndSelect('affectations.matiere', 'matiere')
      .leftJoinAndSelect('affectations.etablissement', 'etablissement')
      .leftJoinAndSelect('affectations.niveau', 'niveau')
      .leftJoinAndSelect('enseignant.user', 'user');

    // Apply tenant filter on the enseignant's own etablissementId (not the affectation's)
    if (tenantId) {
      queryBuilder.andWhere('enseignant.etablissementId = :tenantId', { tenantId });
    }

    // Apply etablissementId filter
    if (etablissementId) {
      queryBuilder.andWhere('enseignant.etablissementId = :etablissementId', {
        etablissementId,
      });
    }

    // Apply matiereId filter
    if (matiereId) {
      queryBuilder.andWhere('matiere.id = :matiereId', { matiereId });
    }

    // Apply niveauId filter
    if (niveauId) {
      queryBuilder.andWhere('niveau.id = :niveauId', { niveauId });
    }

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(enseignant.lastName ILIKE :search OR enseignant.firstName ILIKE :search OR enseignant.matricule ILIKE :search OR enseignant.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('enseignant.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, tenantId?: number): Promise<Enseignant> {
    const where: any = { id };
    if (tenantId) {
      where.etablissementId = tenantId;
    }

    const enseignant = await this.enseignantRepository.findOne({
      where,
      relations: {
        affectations: {
          matiere: true,
          etablissement: true,
          niveau: true,
        },
        user: true,
      },
    });

    if (!enseignant) {
      throw new NotFoundException(
        `L'enseignant avec l'ID ${id} n'a pas été trouvé`,
      );
    }
    return enseignant;
  }

  async findByMatricule(
    matricule: string,
    tenantId?: number,
  ): Promise<Enseignant | null> {
    const where: any = { matricule };
    if (tenantId) {
      where.etablissementId = tenantId;
    }

    return await this.enseignantRepository.findOne({
      where,
      relations: {
        affectations: {
          matiere: true,
          etablissement: true,
          niveau: true,
        },
        user: true,
      },
    });
  }

  async update(
    id: number,
    updateEnseignantDto: UpdateEnseignantDto,
    tenantId?: number,
  ): Promise<Enseignant> {
    const enseignant = await this.findOne(id, tenantId);
    const { email, matricule } = updateEnseignantDto;

    if (email && email !== enseignant.email) {
      const existingEmail = await this.enseignantRepository.findOneBy({
        email,
      });
      if (existingEmail) {
        throw new BadRequestException(
          `Un enseignant avec l'email "${email}" existe déjà`,
        );
      }
    }

    if (matricule && matricule !== enseignant.matricule) {
      const existingMatricule = await this.enseignantRepository.findOneBy({
        matricule,
      });
      if (existingMatricule) {
        throw new BadRequestException(
          `Un enseignant avec le matricule "${matricule}" existe déjà`,
        );
      }
    }

    Object.assign(enseignant, updateEnseignantDto);
    const savedEnseignant = await this.enseignantRepository.save(enseignant);

    // Synchroniser le username si le prénom a changé
    if (updateEnseignantDto.firstName && enseignant.user) {
      await this.userService.update(enseignant.user.id, {
        username: updateEnseignantDto.firstName,
      });
    }

    return savedEnseignant;
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const enseignant = await this.findOne(id, tenantId);
    await this.enseignantRepository.remove(enseignant);
  }

  async resetCredentials(id: number, tenantId?: number): Promise<{ email: string; password: string }> {
    const enseignant = await this.findOne(id, tenantId);
    const normalizedEmail = enseignant.email.toLowerCase().trim();

    // Normalize email on Enseignant if needed
    if (enseignant.email !== normalizedEmail) {
      enseignant.email = normalizedEmail;
      await this.enseignantRepository.save(enseignant);
    }

    const user = await this.userService.findByEnseignantId(id);
    if (!user) {
      throw new NotFoundException(
        `Aucun compte utilisateur trouvé pour cet enseignant. Contactez un super-administrateur.`,
      );
    }

    await this.userService.update(user.id, {
      email: normalizedEmail,
      password: '12345678',
      isActive: true,
    });

    return { email: normalizedEmail, password: '12345678' };
  }

  async updateProfilePicture(
    id: number,
    filePath: string,
    tenantId?: number,
  ): Promise<Enseignant> {
    const enseignant = await this.findOne(id, tenantId);
    enseignant.photoPath = filePath.replace(/\\/g, '/');
    return await this.enseignantRepository.save(enseignant);
  }

  async addAffectation(
    enseignantId: number,
    createAffectationDto: CreateAffectationDto,
    tenantId?: number,
  ): Promise<Affectation> {
    const { matiereId, etablissementId: dtoEtablissementId, niveauId } = createAffectationDto;

    const finalEtablissementId = tenantId || dtoEtablissementId;
    if (!finalEtablissementId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    const enseignant = await this.findOne(enseignantId);

    const matiere = await this.matiereRepository.findOneBy({ id: matiereId });
    if (!matiere)
      throw new NotFoundException(`Matière avec l'ID ${matiereId} introuvable`);

    const etablissement = await this.etablissementRepository.findOneBy({
      id: finalEtablissementId,
    });
    if (!etablissement)
      throw new NotFoundException(
        `Établissement avec l'ID ${finalEtablissementId} introuvable`,
      );

    const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
    if (!niveau)
      throw new NotFoundException(`Niveau avec l'ID ${niveauId} introuvable`);

    // Vérifier si cette affectation existe déjà pour cet enseignant
    const existingAffectation = await this.affectationRepository.findOne({
      where: {
        enseignant: { id: enseignantId },
        matiere: { id: matiereId },
        etablissement: { id: finalEtablissementId },
        niveau: { id: niveauId },
      },
    });

    if (existingAffectation) {
      throw new BadRequestException(
        'Cet enseignement est déjà affecté à cet enseignant',
      );
    }

    const affectation = this.affectationRepository.create({
      enseignant,
      matiere,
      etablissement,
      niveau,
    });

    return await this.affectationRepository.save(affectation);
  }

  async removeAffectation(affectationId: number): Promise<void> {
    const affectation = await this.affectationRepository.findOneBy({
      id: affectationId,
    });
    if (!affectation) {
      throw new NotFoundException(
        `L'affectation avec l'ID ${affectationId} n'a pas été trouvée`,
      );
    }
    await this.affectationRepository.remove(affectation);
  }

  async isResponsibleFor(
    enseignantId: number,
    matiereId: number,
    niveauId: number,
    etablissementIds?: number[],
  ): Promise<boolean> {
    const where: any = {
      enseignant: { id: enseignantId },
      matiere: { id: matiereId },
      niveau: { id: niveauId },
    };

    if (etablissementIds && etablissementIds.length > 0) {
      const affectations = await this.affectationRepository.find({
        where: {
          enseignant: { id: enseignantId },
          matiere: { id: matiereId },
          niveau: { id: niveauId },
        },
        relations: { etablissement: true },
      });

      return affectations.some((a) =>
        etablissementIds.includes(a.etablissement.id),
      );
    }

    const affectation = await this.affectationRepository.findOne({
      where,
    });
    return !!affectation;
  }

  async getMatiereIdsByEnseignant(enseignantId: number): Promise<number[]> {
    const affectations = await this.affectationRepository.find({
      where: { enseignant: { id: enseignantId } },
      relations: { matiere: true },
    });
    return [...new Set(affectations.map((a) => a.matiere?.id).filter(Boolean) as number[])];
  }
}
