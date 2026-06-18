import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { CreateEtudiantDto } from './dto/create-etudiant.dto';
import { UpdateEtudiantDto } from './dto/update-etudiant.dto';
import { Etudiant, EnrollmentStatus } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Parent, ParentGender } from '../parent/entities/parent.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantContext } from '../common/tenant/tenant.context';
import { UserService } from '../user/user.service';
import { User, UserRole } from '../user/entities/user.entity';
import { ValidateEtudiantDto } from './dto/validate-etudiant.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Role } from '../user/entities/user.entity';

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
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async preRegister(data: any): Promise<Etudiant> {
    const { password, ...etudiantData } = data;

    // Créer le profil étudiant en attente
    const etudiant = await this.create({
      ...etudiantData,
      status: EnrollmentStatus.EN_ATTENTE,
    });

    // Créer le compte utilisateur inactif
    await this.userService.create({
      email: etudiant.email,
      password: password,
      role: UserRole.ETUDIANT,
      isActive: false,
      username: etudiant.firstName,
    });

    // Créer les comptes parents si nécessaire
    if (etudiant.parents) {
      for (const parent of etudiant.parents) {
        const existingUser = await this.userService.findByEmail(
          parent.phoneNumber,
        );
        if (!existingUser) {
          await this.userService.create({
            email: parent.phoneNumber,
            role: UserRole.PARENT,
            isActive: false,
            username: parent.firstName,
          });
        }
      }
    }

    return etudiant;
  }

  async create(createEtudiantDto: CreateEtudiantDto): Promise<Etudiant> {
    const { etablissementId, classeId, niveauId, parentsData, ...rest } =
      createEtudiantDto;

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

    const parents: Parent[] = [];
    if (parentsData && parentsData.length > 0) {
      let hasTuteur = false;
      for (const pData of parentsData) {
        if (pData.gender === ParentGender.TUTEUR) {
          hasTuteur = true;
        }

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

    // Vérifier l'unicité de l'email
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

    const tenantId = TenantContext.getTenantId();
    const where: FindOptionsWhere<Etudiant>[] = [];

    const baseWhere: any = {};
    if (status) baseWhere.status = status;
    if (tenantId) baseWhere.etablissement = { id: tenantId };

    if (search) {
      where.push(
        { ...baseWhere, lastName: ILike(`%${search}%`) },
        { ...baseWhere, firstName: ILike(`%${search}%`) },
        { ...baseWhere, matricule: ILike(`%${search}%`) },
        { ...baseWhere, email: ILike(`%${search}%`) },
      );
    } else {
      where.push(baseWhere);
    }

    const [items, total] = await this.etudiantRepository.findAndCount({
      where,
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
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

  async findOne(id: number): Promise<Etudiant> {
    const tenantId = TenantContext.getTenantId();
    const where: any = { id };
    if (tenantId) where.etablissement = { id: tenantId };

    const etudiant = await this.etudiantRepository.findOne({
      where,
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        parents: true,
        user: true,
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
        user: true,
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

    Object.assign(etudiant, rest);
    const savedEtudiant = await this.etudiantRepository.save(etudiant);

    // Synchroniser le username si le prénom a changé
    if (rest.firstName && etudiant.user) {
      await this.userService.update(etudiant.user.id, {
        username: rest.firstName,
      });
    }

    return savedEtudiant;
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

    const savedEtudiant = await this.etudiantRepository.save(etudiant);

    // Activer le compte utilisateur de l'étudiant
    const studentUser = await this.userService.findByEtudiantId(id);
    if (studentUser) {
      await this.userService.update(studentUser.id, { isActive: true });
    }

    // Activer les comptes utilisateurs des parents
    if (savedEtudiant.parents) {
      for (const parent of savedEtudiant.parents) {
        const parentUser = await this.userService.findByEmail(
          parent.phoneNumber,
        );
        if (parentUser && parentUser.role === Role.PARENT) {
          await this.userService.update(parentUser.id, { isActive: true });
        }
      }
    }

    return savedEtudiant;
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
