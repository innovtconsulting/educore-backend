import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';
import { Classe } from './entities/classe.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class ClasseService {
  constructor(
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
  ) {}

  async create(
    createClasseDto: CreateClasseDto,
    tenantId?: number,
  ): Promise<Classe> {
    const { name, etablissementId: dtoEtablissementId } = createClasseDto;

    // Utiliser le tenantId si fourni (pour ADMIN), sinon utiliser etablissementId du DTO
    const etablissementId = tenantId || dtoEtablissementId;
    if (!etablissementId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    // Vérifier l'existence de l'établissement
    const etablissement = await this.etablissementRepository.findOne({
      where: { id: etablissementId },
    });

    if (!etablissement) {
      throw new NotFoundException('Établissement introuvable');
    }

    // Vérifier l'unicité du nom de classe par établissement
    const existingClasse = await this.classeRepository.findOne({
      where: {
        name,
        etablissement: { id: etablissementId },
      },
    });

    if (existingClasse) {
      throw new BadRequestException(
        `La classe "${name}" existe déjà dans l'établissement "${etablissement.name}"`,
      );
    }

    const classe = this.classeRepository.create({
      name,
      etablissement,
    });

    return await this.classeRepository.save(classe);
  }

  async findAll(
    tenantId?: number,
    etablissementId?: number,
  ): Promise<Classe[]> {
    const where: any = {};
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    if (etablissementId) {
      where.etablissement = { id: etablissementId };
    }

    return await this.classeRepository.find({
      where,
      relations: { etablissement: true, niveaux: true },
    });
  }

  async findOne(id: number, tenantId?: number): Promise<Classe> {
    const where: any = { id };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }

    const classe = await this.classeRepository.findOne({
      where,
      relations: { etablissement: true, niveaux: true },
    });

    if (!classe) {
      throw new NotFoundException(
        `La classe avec l'ID ${id} n'a pas été trouvée`,
      );
    }
    return classe;
  }

  async update(
    id: number,
    updateClasseDto: UpdateClasseDto,
    tenantId?: number,
  ): Promise<Classe> {
    const { name, etablissementId } = updateClasseDto;
    const classe = await this.findOne(id, tenantId);

    if (name) {
      classe.name = name;
    }

    if (etablissementId) {
      const etablissement = await this.etablissementRepository.findOne({
        where: { id: etablissementId },
      });
      if (!etablissement) {
        throw new NotFoundException('Établissement introuvable');
      }
      classe.etablissement = etablissement;
    }

    // Vérifier l'unicité lors de la mise à jour
    if (name || etablissementId) {
      const existingClasse = await this.classeRepository.findOne({
        where: {
          name: classe.name,
          etablissement: { id: classe.etablissement.id },
        },
      });
      if (existingClasse && existingClasse.id !== id) {
        throw new BadRequestException(
          `La classe "${classe.name}" existe déjà dans l'établissement "${classe.etablissement.name}"`,
        );
      }
    }

    return await this.classeRepository.save(classe);
  }

  async findByName(name: string, tenantId?: number): Promise<Classe | null> {
    const where: any = { name: ILike(name) };
    if (tenantId) {
      where.etablissement = { id: tenantId };
    }
    return await this.classeRepository.findOne({
      where,
      relations: { etablissement: true },
    });
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const classe = await this.findOne(id, tenantId);
    await this.classeRepository.remove(classe);
  }
}
