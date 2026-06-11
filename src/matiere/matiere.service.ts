import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, ILike, FindOptionsWhere } from 'typeorm';
import { CreateMatiereDto } from './dto/create-matiere.dto';
import { UpdateMatiereDto } from './dto/update-matiere.dto';
import { Matiere } from './entities/matiere.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class MatiereService {
  constructor(
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
  ) {}

  async create(createMatiereDto: CreateMatiereDto): Promise<Matiere> {
    const { code, name, coefficient, classeIds, niveauIds } = createMatiereDto;

    // Vérifier l'unicité du code
    const existingMatiere = await this.matiereRepository.findOneBy({ code });
    if (existingMatiere) {
      throw new BadRequestException(
        `La matière avec le code "${code}" existe déjà`,
      );
    }

    // Vérifier l'existence des classes
    const classes = await this.classeRepository.findBy({
      id: In(classeIds),
    });
    if (classes.length !== classeIds.length) {
      throw new NotFoundException('Une ou plusieurs classes sont introuvables');
    }

    // Vérifier l'existence des niveaux
    const niveaux = await this.niveauRepository.findBy({
      id: In(niveauIds),
    });
    if (niveaux.length !== niveauIds.length) {
      throw new NotFoundException('Un ou plusieurs niveaux sont introuvables');
    }

    const matiere = this.matiereRepository.create({
      code,
      name,
      coefficient,
      classes,
      niveaux,
    });

    return await this.matiereRepository.save(matiere);
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 15, search } = paginationQuery;
    const skip = (page - 1) * limit;

    let where: FindOptionsWhere<Matiere> | FindOptionsWhere<Matiere>[] = {};
    if (search) {
      where = [
        { name: ILike(`%${search}%`) },
        { code: ILike(`%${search}%`) },
      ];
    }

    const [items, total] = await this.matiereRepository.findAndCount({
      where,
      relations: { classes: true, niveaux: true },
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

  async findOne(id: number): Promise<Matiere> {
    const matiere = await this.matiereRepository.findOne({
      where: { id },
      relations: { classes: true, niveaux: true },
    });
    if (!matiere) {
      throw new NotFoundException(
        `La matière avec l'ID ${id} n'a pas été trouvée`,
      );
    }
    return matiere;
  }

  async update(
    id: number,
    updateMatiereDto: UpdateMatiereDto,
  ): Promise<Matiere> {
    const { code, name, coefficient, classeIds, niveauIds } = updateMatiereDto;
    const matiere = await this.findOne(id);

    if (code) {
      const existingMatiere = await this.matiereRepository.findOneBy({ code });
      if (existingMatiere && existingMatiere.id !== id) {
        throw new BadRequestException(
          `La matière avec le code "${code}" existe déjà`,
        );
      }
      matiere.code = code;
    }

    if (name) {
      matiere.name = name;
    }

    if (coefficient !== undefined) {
      matiere.coefficient = coefficient;
    }

    if (classeIds) {
      const classes = await this.classeRepository.findBy({
        id: In(classeIds),
      });
      if (classes.length !== classeIds.length) {
        throw new NotFoundException(
          'Une ou plusieurs classes sont introuvables',
        );
      }
      matiere.classes = classes;
    }

    if (niveauIds) {
      const niveaux = await this.niveauRepository.findBy({
        id: In(niveauIds),
      });
      if (niveaux.length !== niveauIds.length) {
        throw new NotFoundException(
          'Un ou plusieurs niveaux sont introuvables',
        );
      }
      matiere.niveaux = niveaux;
    }

    return await this.matiereRepository.save(matiere);
  }

  async remove(id: number): Promise<void> {
    const matiere = await this.findOne(id);
    await this.matiereRepository.remove(matiere);
  }
}
