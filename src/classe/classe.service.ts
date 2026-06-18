import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, ILike } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';
import { Classe } from './entities/classe.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

@Injectable()
export class ClasseService {
  constructor(
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
  ) {}

  async create(createClasseDto: CreateClasseDto): Promise<Classe> {
    const { name, etablissementIds, niveauIds } = createClasseDto;

    // Vérifier l'existence des niveaux
    const niveaux = await this.niveauRepository.findBy({
      id: In(niveauIds),
    });

    if (niveaux.length !== niveauIds.length) {
      throw new NotFoundException('Un ou plusieurs niveaux sont introuvables');
    }

    // Vérifier l'existence des établissements
    const etablissements = await this.etablissementRepository.findBy({
      id: In(etablissementIds),
    });

    if (etablissements.length !== etablissementIds.length) {
      throw new NotFoundException(
        'Un ou plusieurs établissements sont introuvables',
      );
    }

    // Vérifier l'unicité du nom de classe par établissement
    for (const etablissement of etablissements) {
      const existingClasse = await this.classeRepository.findOne({
        where: {
          name,
          etablissements: { id: etablissement.id },
        },
      });
      if (existingClasse) {
        throw new BadRequestException(
          `La classe "${name}" existe déjà dans l'établissement "${etablissement.name}"`,
        );
      }
    }

    const classe = this.classeRepository.create({
      name,
      niveaux,
      etablissements,
    });

    return await this.classeRepository.save(classe);
  }

  async findAll(): Promise<Classe[]> {
    const tenantId = TenantContext.getTenantId();
    const where: any = {};
    if (tenantId) {
      where.etablissements = { id: tenantId };
    }
    return await this.classeRepository.find({
      where,
      relations: { etablissements: true, niveaux: true },
    });
  }

  async findOne(id: number): Promise<Classe> {
    const tenantId = TenantContext.getTenantId();
    const where: any = { id };
    if (tenantId) {
      where.etablissements = { id: tenantId };
    }
    const classe = await this.classeRepository.findOne({
      where,
      relations: { etablissements: true, niveaux: true },
    });
    if (!classe) {
      throw new NotFoundException(
        `La classe avec l'ID ${id} n'a pas été trouvée`,
      );
    }
    return classe;
  }

  async update(id: number, updateClasseDto: UpdateClasseDto): Promise<Classe> {
    const { name, etablissementIds, niveauIds } = updateClasseDto;
    const classe = await this.findOne(id);

    if (name) {
      classe.name = name;
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
      classe.niveaux = niveaux;
    }

    if (etablissementIds) {
      const etablissements = await this.etablissementRepository.findBy({
        id: In(etablissementIds),
      });
      if (etablissements.length !== etablissementIds.length) {
        throw new NotFoundException(
          'Un ou plusieurs établissements sont introuvables',
        );
      }
      classe.etablissements = etablissements;
    }

    // Vérifier l'unicité lors de la mise à jour
    const finalEtablissements = classe.etablissements;
    const finalName = classe.name;

    for (const etablissement of finalEtablissements) {
      const existingClasse = await this.classeRepository.findOne({
        where: {
          name: finalName,
          etablissements: { id: etablissement.id },
        },
      });
      if (existingClasse && existingClasse.id !== id) {
        throw new BadRequestException(
          `La classe "${finalName}" existe déjà dans l'établissement "${etablissement.name}"`,
        );
      }
    }

    return await this.classeRepository.save(classe);
  }

  async findByName(name: string): Promise<Classe | null> {
    const tenantId = TenantContext.getTenantId();
    const where: any = { name: ILike(name) };
    if (tenantId) {
      where.etablissements = { id: tenantId };
    }
    return await this.classeRepository.findOne({
      where,
    });
  }

  async remove(id: number): Promise<void> {
    const classe = await this.findOne(id);
    await this.classeRepository.remove(classe);
  }
}
