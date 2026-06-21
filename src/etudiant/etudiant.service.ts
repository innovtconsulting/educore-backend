import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  ILike,
  FindOptionsWhere,
  DataSource,
  QueryRunner,
} from 'typeorm';
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
import {
  CheckImportResultDto,
  CheckImportResultSheetDto,
  RunImportDto,
  ImportReportDto,
  ImportReportSheetDto,
  StudentImportRowDto,
  ConfirmImportDto,
} from './dto/import-student.dto';

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
        console.log('DEBUG - Email already exists:', rest.email);
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

    try {
      return await this.etudiantRepository.save(etudiant);
    } catch (error) {
      console.log('DEBUG - Error saving student:', error);
      throw error;
    }
  }

  async findAll(
    paginationQuery: PaginationQueryDto & {
      status?: EnrollmentStatus;
      etablissementId?: number;
      classeId?: number;
      niveauId?: number;
    },
  ): Promise<{
    items: Etudiant[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, search, status, etablissementId, classeId, niveauId } = paginationQuery;
    console.log('DEBUG backend - findAll query parameters:', { page, limit, search, status, etablissementId, classeId, niveauId });
    const p = page ?? 1;
    const l = limit ?? 20;
    const skip = (p - 1) * l;

    const tenantId = TenantContext.getTenantId();
    console.log('DEBUG backend - tenantId:', tenantId);
    const where: FindOptionsWhere<Etudiant>[] = [];

    const baseWhere: any = {};
    if (status) baseWhere.status = status;
    if (tenantId) baseWhere.etablissement = { id: tenantId };
    if (etablissementId && !tenantId)
      baseWhere.etablissement = { id: etablissementId };
    if (classeId) baseWhere.classe = { id: classeId };
    if (niveauId) baseWhere.niveau = { id: niveauId };

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
    console.log('DEBUG backend - constructed where clause:', JSON.stringify(where));

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
      take: l,
      order: { id: 'DESC' },
    });

    return {
      items,
      total,
      page: p,
      limit: l,
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

  async validateImport(
    fileBuffer: Buffer,
    sheetName?: string,
  ): Promise<{
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
      throw new BadRequestException(
        sheetName
          ? `Feuille "${sheetName}" introuvable`
          : 'Fiche de calcul introuvable',
      );
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
          throw new Error(
            'Champs obligatoires manquants (Nom, Prénom, Classe, Niveau)',
          );
        }

        const studentEmail = email || undefined;

        if (studentEmail) {
          const existing = await this.etudiantRepository.findOne({
            where: { email: studentEmail },
          });
          if (existing)
            throw new Error(
              `L'étudiant avec l'email ${studentEmail} existe déjà`,
            );
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

  async confirmImport(
    students: StudentImportRowDto[],
  ): Promise<{ success: number; failed: number }> {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException("ID d'établissement manquant");

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let successCount = 0;
    let failedCount = 0;

    try {
      const etablissement = await this.etablissementRepository.findOneBy({
        id: tenantId,
      });
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

  // Column alias mapping
  private getColumnAliases(): Record<string, string[]> {
    return {
      matricule: [
        'matricule',
        'matricule étudiant',
        'numero matricule',
        'matricule_etudiant',
      ],
      nom: [
        'nom',
        'nom de famille',
        'lastname',
        'last name',
        'nom_famille',
        'noms',
      ],
      prenom: [
        'prenom',
        'prénom',
        'firstname',
        'first name',
        'prenom_etudiant',
        'prenoms',
      ],
      nomprenom: ['nom et prénom', 'nomprenom', 'nom et prenom', 'nom_prenom'],
      telephone: [
        'telephone',
        'téléphone',
        'tel',
        'phone',
        'numero telephone',
        'numéro téléphone',
      ],
      datenaissance: [
        'datenaissance',
        'date de naissance',
        'date_naissance',
        'birthdate',
        'birth date',
      ],
      lieunaissance: [
        'lieunaissance',
        'lieu de naissance',
        'lieu_naissance',
        'birthplace',
        'birth place',
      ],
      sexe: ['sexe', 'genre', 'gender'],
      email: ['email', 'mail', 'adresse email', 'adresse mail', 'e-mail'],
      classe: ['classe', 'class'],
      niveau: ['niveau', 'level', 'grade'],
      parcours: ['parcours', 'filière', 'filiere', 'course', 'program'],
    };
  }

  // Normalize column name
  private normalizeColumnName(colName: string): string {
    return colName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // Map raw headers to normalized fields
  private mapHeaders(headers: string[]): Record<string, number> {
    const aliases = this.getColumnAliases();
    const headerMap: Record<string, number> = {};

    headers.forEach((header, index) => {
      const normalizedHeader = this.normalizeColumnName(header);
      for (const [field, aliasList] of Object.entries(aliases)) {
        if (
          aliasList.some(
            (alias) => this.normalizeColumnName(alias) === normalizedHeader,
          )
        ) {
          headerMap[field] = index;
          break;
        }
      }
    });

    return headerMap;
  }

  // Clean phone number
  private cleanPhoneNumber(phone: any): string {
    let cleaned = String(phone).replace(/\s/g, '');
    if (/^\d{9}$/.test(cleaned)) {
      cleaned = '0' + cleaned;
    }
    return cleaned;
  }

  // Split multiple phones
  private splitPhones(phoneStr: any): {
    main: string;
    supplementary: string[];
  } {
    if (!phoneStr) return { main: '', supplementary: [] };
    const phones = String(phoneStr)
      .split(/[\/,;]/)
      .map((p) => this.cleanPhoneNumber(p))
      .filter((p) => p);
    return {
      main: phones[0] || '',
      supplementary: phones.slice(1),
    };
  }

  // Generate unique matricule
  private async generateMatricule(
    acronyme: string,
    queryRunner?: QueryRunner,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${acronyme.toUpperCase()}-${year}-`;

    const repo = queryRunner
      ? queryRunner.manager.getRepository(Etudiant)
      : this.etudiantRepository;
    const lastMatricule = await repo.findOne({
      where: { matricule: ILike(`${prefix}%`) },
      order: { matricule: 'DESC' },
    });

    let nextNum = 1;
    if (lastMatricule && lastMatricule.matricule) {
      const match = lastMatricule.matricule.match(/-(\d{4})$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  // Find or create Niveau
  private async findOrCreateNiveau(
    nom: string,
    etablissement: Etablissement,
    queryRunner: QueryRunner,
  ): Promise<Niveau> {
    const repo = queryRunner.manager.getRepository(Niveau);
    let niveau = await repo.findOne({ where: { name: nom } });
    if (!niveau) {
      niveau = repo.create({ name: nom });
      niveau = await repo.save(niveau);
    }
    return niveau;
  }

  // Find or create Classe (Parcours)
  private async findOrCreateClasse(
    nom: string,
    niveau: Niveau,
    etablissement: Etablissement,
    estGenereParDefaut: boolean,
    queryRunner: QueryRunner,
  ): Promise<Classe> {
    const repo = queryRunner.manager.getRepository(Classe);
    let classe = await repo.findOne({
      where: { name: nom },
      relations: { niveaux: true, etablissements: true },
    });

    if (!classe) {
      classe = repo.create({
        name: nom,
        niveaux: [niveau],
        etablissements: [etablissement],
      });
      classe = await repo.save(classe);
    } else {
      // Ensure relations are present
      if (!classe.niveaux.find((n) => n.id === niveau.id)) {
        classe.niveaux.push(niveau);
        classe = await repo.save(classe);
      }
      if (!classe.etablissements.find((e) => e.id === etablissement.id)) {
        classe.etablissements.push(etablissement);
        classe = await repo.save(classe);
      }
    }
    return classe;
  }

  // Resolve or create default Classe (Parcours) for Niveau
  private async resolveOrCreateDefaultClasseForNiveau(
    niveau: Niveau,
    etablissement: Etablissement,
    queryRunner: QueryRunner,
  ): Promise<Classe> {
    const defaultName = `${niveau.name} - Parcours unique`;
    return await this.findOrCreateClasse(
      defaultName,
      niveau,
      etablissement,
      true,
      queryRunner,
    );
  }

  // Check import (validate file without saving)
  async checkImport(fileBuffer: Buffer): Promise<CheckImportResultDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const sheets: CheckImportResultSheetDto[] = [];

    for (const worksheet of workbook.worksheets) {
      const acronyme = worksheet.name;
      const existingEtab = await this.etablissementRepository.findOne({
        where: { acronyme },
      });

      // Get headers
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers.push(cell.text?.trim() || `Colonne ${colNumber}`);
      });

      // Count data rows
      let nombreLignes = 0;
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        if (row.hasValues) nombreLignes++;
      }

      sheets.push({
        acronyme,
        existeDeja: !!existingEtab,
        nombreLignes,
        headers,
      });
    }

    return { sheets };
  }

  // Run import
  async runImport(
    fileBuffer: Buffer,
    runDto: RunImportDto,
  ): Promise<ImportReportDto> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const feuilles: ImportReportSheetDto[] = [];
    let totalEtudiantsImportes = 0;
    let totalErreurs = 0;

    try {
      // First, create any new establishments
      const etabMap = new Map<string, Etablissement>();

      // Load existing establishments
      const existingEtabs = await this.etablissementRepository.find();
      existingEtabs.forEach((etab) => {
        if (etab.acronyme) etabMap.set(etab.acronyme, etab);
      });

      // Create new establishments
      if (runDto.etablissementsACreer) {
        for (const etabToCreate of runDto.etablissementsACreer) {
          if (!etabMap.has(etabToCreate.acronyme)) {
            const newEtab = queryRunner.manager
              .getRepository(Etablissement)
              .create({
                name: etabToCreate.name,
                acronyme: etabToCreate.acronyme,
                address: 'À définir',
                email: `contact@${etabToCreate.acronyme.toLowerCase()}.edu`,
              });
            const savedEtab = await queryRunner.manager.save(newEtab);
            etabMap.set(etabToCreate.acronyme, savedEtab);
          }
        }
      }

      // Process each sheet
      for (const worksheet of workbook.worksheets) {
        const acronyme = worksheet.name;
        const sheetReport: ImportReportSheetDto = {
          acronyme,
          nombreEtudiantsImportes: 0,
          nombreErreurs: 0,
          erreurs: [],
          aEteCree:
            !existingEtabs.find((e) => e.acronyme === acronyme) &&
            !!runDto.etablissementsACreer?.find((e) => e.acronyme === acronyme),
        };

        const etablissement = etabMap.get(acronyme);
        if (!etablissement) {
          sheetReport.erreurs.push(
            `Établissement "${acronyme}" non trouvé et non marqué pour création`,
          );
          feuilles.push(sheetReport);
          continue;
        }

        // Get and map headers
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell((cell) => {
          headers.push(cell.text?.trim() || '');
        });
        const headerMap = this.mapHeaders(headers);

        // Determine mode (with or without parcours)
        const hasParcours = 'parcours' in headerMap;
        const hasClasse = 'classe' in headerMap;
        const hasNiveau = 'niveau' in headerMap;

        // Process each student row
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          if (!row.hasValues) continue;

          try {
            // Extract data from row
            const getCellValue = (field: string) => {
              if (!(field in headerMap)) return undefined;
              const cell = row.getCell(headerMap[field] + 1);
              return cell.value;
            };

            const getCellText = (field: string) => {
              const val = getCellValue(field);
              return val ? String(val).trim() : undefined;
            };

            let nom = getCellText('nom');
            let prenom = getCellText('prenom');
            const nomprenom = getCellText('nomprenom');

            if (!nom && !prenom && nomprenom) {
              // Split combined name (heuristic: first word = nom, rest = prenom)
              const parts = nomprenom.split(/\s+/);
              nom = parts[0];
              prenom = parts.slice(1).join(' ');
            }

            if (!nom || !prenom) {
              throw new Error(`Ligne ${i}: Nom et prénom obligatoires`);
            }

            const matricule = getCellText('matricule');
            const telephoneRaw = getCellValue('telephone');
            const {
              main: telephone,
              supplementary: telephonesSupplementaires,
            } = this.splitPhones(telephoneRaw);
            const email = getCellText('email');
            const sexe = getCellText('sexe');
            const dateNaissanceRaw = getCellValue('datenaissance');
            let dateNaissance: Date | undefined;

            if (dateNaissanceRaw) {
              if (dateNaissanceRaw instanceof Date) {
                dateNaissance = dateNaissanceRaw;
              } else {
                dateNaissance = new Date(String(dateNaissanceRaw));
                if (isNaN(dateNaissance.getTime())) dateNaissance = undefined;
              }
            }

            // Resolve niveau
            let niveauName = getCellText('niveau');
            if (!niveauName && hasClasse && !hasParcours) {
              niveauName = getCellText('classe');
            }
            if (!niveauName) {
              throw new Error(`Ligne ${i}: Niveau ou classe obligatoire`);
            }

            const niveau = await this.findOrCreateNiveau(
              niveauName,
              etablissement,
              queryRunner,
            );

            // Resolve classe (parcours)
            let classe: Classe;
            if (hasParcours) {
              const parcoursName = getCellText('parcours');
              if (!parcoursName)
                throw new Error(`Ligne ${i}: Parcours obligatoire`);
              classe = await this.findOrCreateClasse(
                parcoursName,
                niveau,
                etablissement,
                false,
                queryRunner,
              );
            } else {
              classe = await this.resolveOrCreateDefaultClasseForNiveau(
                niveau,
                etablissement,
                queryRunner,
              );
            }

            // Check for existing student by matricule
            let finalMatricule = matricule;
            if (finalMatricule) {
              const existingStudent = await queryRunner.manager
                .getRepository(Etudiant)
                .findOne({
                  where: { matricule: finalMatricule },
                });
              if (existingStudent) {
                throw new Error(
                  `Ligne ${i}: Matricule ${finalMatricule} déjà existant`,
                );
              }
            } else {
              finalMatricule = await this.generateMatricule(
                acronyme,
                queryRunner,
              );
            }

            // Check for existing student by email
            if (email) {
              const existingStudent = await queryRunner.manager
                .getRepository(Etudiant)
                .findOne({
                  where: { email },
                });
              if (existingStudent) {
                throw new Error(`Ligne ${i}: Email ${email} déjà existant`);
              }
            }

            // Create student
            const etudiant = queryRunner.manager
              .getRepository(Etudiant)
              .create({
                matricule: finalMatricule,
                lastName: nom,
                firstName: prenom,
                gender: sexe,
                birthDate: dateNaissance,
                email: email || null,
                phoneNumber: telephone,
                telephonesSupplementaires,
                status: EnrollmentStatus.ACTIF,
                etablissement,
                classe,
                niveau,
              });

            await queryRunner.manager.save(etudiant);
            sheetReport.nombreEtudiantsImportes++;
            totalEtudiantsImportes++;
          } catch (error) {
            sheetReport.nombreErreurs++;
            sheetReport.erreurs.push(error.message || `Erreur ligne ${i}`);
            totalErreurs++;
          }
        }

        feuilles.push(sheetReport);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return {
      feuilles,
      totalEtudiantsImportes,
      totalErreurs,
    };
  }
}
