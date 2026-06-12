import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEtudiantDto } from './dto/create-etudiant.dto';
import { UpdateEtudiantDto } from './dto/update-etudiant.dto';
import { ValidateEtudiantDto } from './dto/validate-etudiant.dto';
import { Etudiant, EnrollmentStatus } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Parent, ParentGender } from '../parent/entities/parent.entity';
import { In, ILike, FindOptionsWhere } from 'typeorm';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class EtudiantService {
  constructor(
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
  ) {}

  async create(createEtudiantDto: CreateEtudiantDto): Promise<Etudiant> {
    const { etablissementId, classeId, niveauId, parentsData, ...rest } =
      createEtudiantDto;

    // Vérifier l'existence des relations de base
    const etablissement = await this.etablissementRepository.findOneBy({
      id: etablissementId,
    });
    if (!etablissement)
      throw new NotFoundException(
        `Établissement #${etablissementId} introuvable`,
      );

    const classe = await this.classeRepository.findOneBy({ id: classeId });
    if (!classe) throw new NotFoundException(`Classe #${classeId} introuvable`);

    const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
    if (!niveau) throw new NotFoundException(`Niveau #${niveauId} introuvable`);

    let parents: Parent[] = [];
    if (parentsData && parentsData.length > 0) {
      for (const pData of parentsData) {
        // Chercher si le parent existe déjà par téléphone ou email
        let parent = await this.parentRepository.findOne({
          where: [
            { phoneNumber: pData.phoneNumber },
            ...(pData.email ? [{ email: pData.email }] : []),
          ],
        });

        if (!parent) {
          // Créer le parent s'il n'existe pas
          parent = this.parentRepository.create(pData);
          parent = await this.parentRepository.save(parent);
        }
        parents.push(parent);
      }

      // Validation des règles métier pour les parents
      if (parents.length > 2) {
        throw new BadRequestException(
          'Un étudiant ne peut pas avoir plus de 2 parents',
        );
      }

      const hasPere = parents.some((p) => p.gender === ParentGender.PERE);
      const hasMere = parents.some((p) => p.gender === ParentGender.MERE);
      const hasTuteur = parents.some((p) => p.gender === ParentGender.TUTEUR);

      if (parents.length === 2) {
        if (!hasPere || !hasMere) {
          throw new BadRequestException(
            "Si l'étudiant a 2 parents, ce doit être un père et une mère",
          );
        }
      }

      if (hasTuteur && parents.length > 1) {
        throw new BadRequestException(
          'Un tuteur ne peut pas être associé à un autre parent',
        );
      }
    } else {
      throw new BadRequestException(
        'Un étudiant doit avoir au moins un parent ou tuteur',
      );
    }

    // Vérifier l'unicité du matricule (si fourni) et de l'email
    const matricule = rest.matricule;
    if (matricule) {
      const existingMatricule = await this.etudiantRepository.findOne({
        where: { matricule },
      });
      if (existingMatricule) {
        throw new BadRequestException('Le matricule existe déjà');
      }
    }

    const existingEmail = await this.etudiantRepository.findOne({
      where: { email: rest.email },
    });
    if (existingEmail) {
      throw new BadRequestException("L'email existe déjà");
    }

    const etudiant = this.etudiantRepository.create({
      ...rest,
      status: rest.status || EnrollmentStatus.ACTIF,
      etablissement,
      classe,
      niveau,
      parents,
    });

    return await this.etudiantRepository.save(etudiant);
  }

  async findAll(
    paginationQuery: PaginationQueryDto & { status?: EnrollmentStatus },
  ): Promise<{
    items: Etudiant[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 15, search, status } = paginationQuery;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Etudiant> | FindOptionsWhere<Etudiant>[] = [];

    if (search) {
      where.push(
        { lastName: ILike(`%${search}%`), ...(status ? { status } : {}) },
        { firstName: ILike(`%${search}%`), ...(status ? { status } : {}) },
        { matricule: ILike(`%${search}%`), ...(status ? { status } : {}) },
        { email: ILike(`%${search}%`), ...(status ? { status } : {}) },
      );
    } else if (status) {
      where.push({ status });
    }

    const [items, total] = await this.etudiantRepository.findAndCount({
      where: where.length > 0 ? where : {},
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
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

  async findOne(id: number): Promise<Etudiant> {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id },
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
      },
    });
    if (!etudiant) throw new NotFoundException(`Étudiant #${id} introuvable`);
    return etudiant;
  }

  async findByMatricule(matricule: string): Promise<Etudiant | null> {
    return await this.etudiantRepository.findOne({
      where: { matricule },
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
      },
    });
  }

  async update(
    id: number,
    updateEtudiantDto: UpdateEtudiantDto,
  ): Promise<Etudiant> {
    const etudiant = await this.findOne(id);
    const { etablissementId, classeId, niveauId, parentsData, ...rest } =
      updateEtudiantDto;

    // Règle métier : Pour passer à l'état ACTIF, le matricule est OBLIGATOIRE
    if (
      rest.status === EnrollmentStatus.ACTIF &&
      !etudiant.matricule &&
      !rest.matricule
    ) {
      throw new BadRequestException(
        "Un matricule doit être attribué pour activer l'inscription de l'étudiant",
      );
    }

    if (etablissementId) {
      const etablissement = await this.etablissementRepository.findOneBy({
        id: etablissementId,
      });
      if (!etablissement)
        throw new NotFoundException(
          `Établissement #${etablissementId} introuvable`,
        );
      etudiant.etablissement = etablissement;
    }

    if (classeId) {
      const classe = await this.classeRepository.findOneBy({ id: classeId });
      if (!classe)
        throw new NotFoundException(`Classe #${classeId} introuvable`);
      etudiant.classe = classe;
    }

    if (niveauId) {
      const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
      if (!niveau)
        throw new NotFoundException(`Niveau #${niveauId} introuvable`);
      etudiant.niveau = niveau;
    }

    if (parentsData && parentsData.length > 0) {
      const parents: Parent[] = [];
      for (const pData of parentsData) {
        let parent = await this.parentRepository.findOne({
          where: [
            { phoneNumber: pData.phoneNumber },
            ...(pData.email ? [{ email: pData.email }] : []),
          ],
        });

        if (!parent) {
          parent = this.parentRepository.create(pData);
          parent = await this.parentRepository.save(parent);
        }
        parents.push(parent);
      }
      etudiant.parents = parents;
    }

    if (rest.matricule && rest.matricule !== etudiant.matricule) {
      const existing = await this.etudiantRepository.findOne({
        where: { matricule: rest.matricule },
      });
      if (existing) {
        throw new BadRequestException('Ce matricule est déjà utilisé');
      }
    }

    Object.assign(etudiant, rest);
    return await this.etudiantRepository.save(etudiant);
  }

  async validateEnrollment(
    id: number,
    validateDto: ValidateEtudiantDto,
  ): Promise<Etudiant> {
    const etudiant = await this.findOne(id);

    // Vérifier si le matricule est déjà pris
    const existing = await this.etudiantRepository.findOne({
      where: { matricule: validateDto.matricule },
    });
    if (existing && existing.id !== id) {
      throw new BadRequestException(
        'Ce matricule est déjà attribué à un autre étudiant',
      );
    }

    // Mettre à jour les informations et le statut
    Object.assign(etudiant, validateDto);
    etudiant.status = EnrollmentStatus.ACTIF;

    return await this.etudiantRepository.save(etudiant);
  }

  async remove(id: number): Promise<void> {
    const etudiant = await this.findOne(id);

    // Supprimer la photo si elle existe
    if (etudiant.photoPath) {
      const fullPath = join(process.cwd(), etudiant.photoPath);
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    }

    await this.etudiantRepository.remove(etudiant);
  }

  async updateProfilePicture(id: number, filePath: string): Promise<Etudiant> {
    const etudiant = await this.findOne(id);

    // Supprimer l'ancienne photo si elle existe
    if (etudiant.photoPath) {
      const oldPath = join(process.cwd(), etudiant.photoPath);
      if (existsSync(oldPath)) {
        await unlink(oldPath);
      }
    }

    // Normaliser le chemin (remplacer \ par / pour compatibilité web)
    etudiant.photoPath = filePath.replace(/\\/g, '/');
    return await this.etudiantRepository.save(etudiant);
  }
}
