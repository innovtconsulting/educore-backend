import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { Enseignant } from './entities/enseignant.entity';
import { Affectation } from './entities/affectation.entity';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UserService } from '../user/user.service';
import { Role } from '../user/entities/user.entity';

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
  ) {}

  async create(createEnseignantDto: CreateEnseignantDto): Promise<Enseignant> {
    const { email, matricule } = createEnseignantDto;

    const existingEmail = await this.enseignantRepository.findOneBy({ email });
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

    const enseignant = this.enseignantRepository.create(createEnseignantDto);
    const savedEnseignant = await this.enseignantRepository.save(enseignant);

    // Création automatique du compte utilisateur avec mot de passe par défaut
    await this.userService.create({
      email: email,
      username: createEnseignantDto.firstName,
      password: '12345678',
      role: Role.ENSEIGNANT,
      enseignant: savedEnseignant,
      isActive: true, // Les enseignants créés par l'admin sont actifs immédiatement
    });

    return savedEnseignant;
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 15, search } = paginationQuery;
    const skip = (page - 1) * limit;

    let where: FindOptionsWhere<Enseignant> | FindOptionsWhere<Enseignant>[] =
      {};
    if (search) {
      where = [
        { lastName: ILike(`%${search}%`) },
        { firstName: ILike(`%${search}%`) },
        { matricule: ILike(`%${search}%`) },
        { email: ILike(`%${search}%`) },
      ];
    }

    const [items, total] = await this.enseignantRepository.findAndCount({
      where,
      relations: {
        affectations: {
          matiere: true,
          etablissement: true,
          niveau: true,
        },
        user: true,
      },
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<Enseignant> {
    const enseignant = await this.enseignantRepository.findOne({
      where: { id },
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

  async findByMatricule(matricule: string): Promise<Enseignant | null> {
    return await this.enseignantRepository.findOne({
      where: { matricule },
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
  ): Promise<Enseignant> {
    const enseignant = await this.findOne(id);
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

  async remove(id: number): Promise<void> {
    const enseignant = await this.findOne(id);
    await this.enseignantRepository.remove(enseignant);
  }

  async updateProfilePicture(
    id: number,
    filePath: string,
  ): Promise<Enseignant> {
    const enseignant = await this.findOne(id);
    enseignant.photoPath = filePath.replace(/\\/g, '/');
    return await this.enseignantRepository.save(enseignant);
  }

  async addAffectation(
    enseignantId: number,
    createAffectationDto: CreateAffectationDto,
  ): Promise<Affectation> {
    const { matiereId, etablissementId, niveauId } = createAffectationDto;

    const enseignant = await this.findOne(enseignantId);

    const matiere = await this.matiereRepository.findOneBy({ id: matiereId });
    if (!matiere)
      throw new NotFoundException(`Matière avec l'ID ${matiereId} introuvable`);

    const etablissement = await this.etablissementRepository.findOneBy({
      id: etablissementId,
    });
    if (!etablissement)
      throw new NotFoundException(
        `Établissement avec l'ID ${etablissementId} introuvable`,
      );

    const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
    if (!niveau)
      throw new NotFoundException(`Niveau avec l'ID ${niveauId} introuvable`);

    // Vérifier si cette affectation existe déjà pour cet enseignant
    const existingAffectation = await this.affectationRepository.findOne({
      where: {
        enseignant: { id: enseignantId },
        matiere: { id: matiereId },
        etablissement: { id: etablissementId },
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
}
