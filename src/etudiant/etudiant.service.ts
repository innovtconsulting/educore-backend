import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere, DataSource, QueryRunner } from 'typeorm';
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
import { User, UserRole, Role } from '../user/entities/user.entity';
import { ValidateEtudiantDto } from './dto/validate-etudiant.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as ExcelJS from 'exceljs';
import { ClasseService } from '../classe/classe.service';
import { NiveauService } from '../niveau/niveau.service';
import { StudentImportRowDto } from './dto/import-student.dto';
import { EtudiantFilterDto } from './dto/etudiant-filter.dto';

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
    private readonly classeService: ClasseService,
    private readonly niveauService: NiveauService,
    private readonly dataSource: DataSource,
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
      // Pour l'import, on peut vouloir rendre les parents optionnels
      // On garde cette vérification pour la création manuelle, mais on l'assouplira pour l'import
      throw new BadRequestException(
        'Un étudiant doit avoir au moins un parent ou tuteur',
      );
    }

    // Vérifier l'unicité de l'email si fourni
    if (rest.email) {
      const existingEmail = await this.etudiantRepository.findOne({
        where: { email: rest.email },
      });
      if (existingEmail) {
        throw new BadRequestException("L'email existe déjà");
      }
    }

    const etudiant = this.etudiantRepository.create({
      ...rest,
      email: rest.email || null,
      status: rest.status || EnrollmentStatus.ACTIF,
      etablissement,
      classe,
      niveau,
      parents,
    }) as Etudiant;

    return await this.etudiantRepository.save(etudiant);
  }

  async findAll(
    paginationQuery: EtudiantFilterDto,
  ): Promise<{
    items: Etudiant[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 15, search, status, etablissementId } = paginationQuery;
    const skip = (page - 1) * limit;

    const tenantId = TenantContext.getTenantId();
    const where: FindOptionsWhere<Etudiant>[] = [];

    const baseWhere: any = {};
    if (status) baseWhere.status = status;

    // Si on est dans un tenant (Admin), on force le filtre
    if (tenantId) {
      baseWhere.etablissement = { id: tenantId };
    } 
    // Sinon (SuperAdmin), on autorise le filtre optionnel par etablissementId
    else if (etablissementId) {
      baseWhere.etablissement = { id: etablissementId };
    }

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

  async validateImport(fileBuffer: Buffer, sheetName?: string): Promise<{
    validStudents: StudentImportRowDto[];
    errors: { line: number; message: string }[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    
    let worksheet: ExcelJS.Worksheet | undefined;
    if (sheetName) {
      worksheet = workbook.getWorksheet(sheetName);
    } else {
      worksheet = workbook.getWorksheet(1);
    }

    const tenantId = TenantContext.getTenantId();

    if (!tenantId) {
      console.log('Tenant ID missing in EtudiantService');
      throw new BadRequestException("ID d'établissement manquant");
    }
    if (!worksheet) {
      throw new BadRequestException(sheetName ? `Feuille "${sheetName}" introuvable` : 'Fiche de calcul introuvable');
    }

    const validStudents: StudentImportRowDto[] = [];
    const errors: { line: number; message: string }[] = [];

    const rowCount = worksheet.rowCount;
    for (let i = 2; i <= rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.hasValues) continue;

      try {
        const lastName = row.getCell(3).text?.trim();
        const firstName = row.getCell(4).text?.trim();
        const gender = row.getCell(5).text?.trim();
        const birthDateValue = row.getCell(6).value;
        const className = row.getCell(7).text?.trim();
        const levelName = row.getCell(8).text?.trim();
        const phoneNumber = row.getCell(11).text?.trim()?.toString();
        const email = row.getCell(12).text?.trim();

        if (!lastName || !firstName || !className || !levelName) {
          throw new Error('Champs obligatoires manquants (Nom, Prénom, Classe, Niveau)');
        }

        const studentEmail = email || undefined;

        if (studentEmail) {
          const existing = await this.etudiantRepository.findOne({ where: { email: studentEmail } });
          if (existing) throw new Error(`L'étudiant avec l'email ${studentEmail} existe déjà`);
        }

        const classe = await this.classeService.findByName(className);
        if (!classe) throw new Error(`Classe "${className}" introuvable`);

        const niveau = await this.niveauService.findByName(levelName);
        if (!niveau) throw new Error(`Niveau "${levelName}" introuvable`);

        let birthDateStr: string | undefined;
        if (birthDateValue instanceof Date) {
          birthDateStr = birthDateValue.toISOString().split('T')[0];
        } else if (typeof birthDateValue === 'string') {
          birthDateStr = new Date(birthDateValue).toISOString().split('T')[0];
        }

        validStudents.push({
          lastName,
          firstName,
          gender,
          birthDate: birthDateStr,
          className,
          levelName,
          phoneNumber,
          email: studentEmail,
        });
      } catch (error) {
        errors.push({ line: i, message: error.message });
      }
    }

    return { validStudents, errors };
  }

  async confirmImport(students: StudentImportRowDto[]): Promise<{ success: number; failed: number }> {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException("ID d'établissement manquant");

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let successCount = 0;
    let failedCount = 0;

    try {
      const etablissement = await this.etablissementRepository.findOneBy({ id: tenantId });
      if (!etablissement) throw new Error('Établissement introuvable');

      for (const s of students) {
        try {
          const classe = await this.classeService.findByName(s.className);
          const niveau = await this.niveauService.findByName(s.levelName);

          if (!classe || !niveau) {
            throw new Error(`Classe ou Niveau introuvable pour ${s.email}`);
          }

          const etudiant = this.etudiantRepository.create({
            lastName: s.lastName,
            firstName: s.firstName,
            gender: s.gender,
            birthDate: s.birthDate ? new Date(s.birthDate) : undefined,
            email: s.email || null,
            phoneNumber: s.phoneNumber,
            status: EnrollmentStatus.EN_ATTENTE,
            etablissement,
            classe,
            niveau,
          }) as Etudiant;

          const savedEtudiant = (await queryRunner.manager.save(
            etudiant,
          )) as Etudiant;

          await this.userService.createWithRunner(queryRunner, {
            email: savedEtudiant.email,
            password: 'password123',
            role: UserRole.ETUDIANT,
            isActive: false,
            username: savedEtudiant.firstName,
            etudiant: savedEtudiant,
          });

          successCount++;
        } catch (innerError) {
          console.error(`Erreur import étudiant ${s.email}:`, innerError);
          failedCount++;
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return { success: successCount, failed: failedCount };
  }
}
