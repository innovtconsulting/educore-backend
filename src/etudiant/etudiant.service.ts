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
import { UserService } from '../user/user.service';
import { User, UserRole, Role } from '../user/entities/user.entity';
import { ValidateEtudiantDto } from './dto/validate-etudiant.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as ExcelJS from 'exceljs';
import { ClasseService } from '../classe/classe.service';
import { NiveauService } from '../niveau/niveau.service';
import { TenantHelper } from '../common/tenant/tenant.helper';
import {
	CheckImportResultDto,
	CheckImportResultSheetDto,
	MissingClasseDto,
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

	async create(
		createEtudiantDto: CreateEtudiantDto,
		tenantId?: number,
	): Promise<Etudiant> {
		const {
			etablissementId: dtoEtablissementId,
			classeId,
			niveauId,
			parentsData,
			...rest
		} = createEtudiantDto;

		// Utiliser le tenantId si fourni (pour ADMIN), sinon utiliser le DTO
		const etablissementId = tenantId || dtoEtablissementId;

		if (!etablissementId) {
			throw new BadRequestException("ID d'établissement manquant");
		}

		const etablissement = await this.etablissementRepository.findOneBy({
			id: etablissementId,
		});
		if (!etablissement)
			throw new NotFoundException(
				`Établissement #${etablissementId} introuvable`,
			);

		const classe = await this.classeRepository.findOne({
			where: TenantHelper.addTenantFilter({ id: classeId }, tenantId),
		});
		if (!classe) throw new NotFoundException(`Classe #${classeId} introuvable`);

		const niveau = await this.niveauRepository.findOne({
			where: TenantHelper.addTenantFilter(
				{ id: niveauId },
				tenantId,
				'classe.etablissement',
			),
		});
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
					parent = this.parentRepository.create({ ...pData, etablissementId });
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
			status: rest.status || EnrollmentStatus.EN_ATTENTE,
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
		tenantId?: number,
	): Promise<{
		items: Etudiant[];
		total: number;
		page: number;
		limit: number;
	}> {
		const { page, limit, search, status, etablissementId, classeId, niveauId } =
			paginationQuery;
		const p = page ?? 1;
		const l = limit ?? 20;
		const skip = (p - 1) * l;

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

	async findOne(id: number, tenantId?: number): Promise<Etudiant> {
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
		tenantId?: number,
	): Promise<Etudiant> {
		const etudiant = await this.findOne(id, tenantId);
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
					const parentEtablissementId = etablissementId || etudiant.etablissement?.id;
					parent = this.parentRepository.create({ ...pData, etablissementId: parentEtablissementId });
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
		tenantId?: number,
	): Promise<Etudiant> {
		const etudiant = await this.findOne(id, tenantId);

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

	async remove(id: number, tenantId?: number): Promise<void> {
		const etudiant = await this.findOne(id, tenantId);

		// Supprimer la photo si elle existe
		if (etudiant.photoPath) {
			const fullPath = join(process.cwd(), etudiant.photoPath);
			if (existsSync(fullPath)) {
				await unlink(fullPath);
			}
		}

		await this.etudiantRepository.remove(etudiant);
	}

	async updateProfilePicture(
		id: number,
		filePath: string,
		tenantId?: number,
	): Promise<Etudiant> {
		const etudiant = await this.findOne(id, tenantId);

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
		tenantId?: number,
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
				const gender = this.normalizeGender(row.getCell(5).text?.trim());
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

				const classe = await this.classeService.findByName(className, tenantId);
				if (!classe) throw new Error(`Classe "${className}" introuvable`);

				const niveau = await this.niveauService.findByName(levelName, tenantId);
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
		tenantId?: number,
	): Promise<{ success: number; failed: number }> {
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
					const classe = await this.classeService.findByName(
						s.className,
						tenantId,
					);
					const niveau = await this.niveauService.findByName(
						s.levelName,
						tenantId,
					);

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

	// Normalize gender: accepts abbreviated or full forms in any case/accent
	private normalizeGender(raw: string | undefined): 'M' | 'F' | undefined {
		if (!raw) return undefined;
		const v = raw
			.trim()
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, ''); // strip accents
		const masculin = ['m', 'h', 'male', 'homme', 'masculin', 'masc', 'garcon', 'garçon'];
		const feminin = ['f', 'female', 'femme', 'feminin', 'fem', 'fille', 'f.'];
		if (masculin.includes(v)) return 'M';
		if (feminin.includes(v)) return 'F';
		// Starts-with fallback for partial matches (ex: "masculin(e)", "féminin(e)")
		if (v.startsWith('m') || v.startsWith('h')) return 'M';
		if (v.startsWith('f')) return 'F';
		return undefined;
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

	// Find or create Classe (Parcours) — doit être créée AVANT le Niveau
	private async findOrCreateClasse(
		nom: string,
		etablissement: Etablissement,
		queryRunner: QueryRunner,
	): Promise<Classe> {
		const repo = queryRunner.manager.getRepository(Classe);
		let classe = await repo.findOne({
			where: { name: nom, etablissement: { id: etablissement.id } },
		});
		if (!classe) {
			classe = repo.create({ name: nom, etablissement });
			classe = await repo.save(classe);
		}
		return classe;
	}

	// Find or create Niveau — toujours rattaché à une Classe (parcours) existante
	private async findOrCreateNiveau(
		nom: string,
		classe: Classe,
		etablissement: Etablissement,
		queryRunner: QueryRunner,
	): Promise<Niveau> {
		const repo = queryRunner.manager.getRepository(Niveau);
		let niveau = await repo.findOne({
			where: { name: nom, etablissement: { id: etablissement.id } },
			relations: { classe: true },
		});
		if (!niveau) {
			niveau = repo.create({ name: nom, classe, etablissement });
			niveau = await repo.save(niveau);
		} else if (!niveau.classe || niveau.classe.id !== classe.id) {
			// Rattacher au bon parcours si ce n'est pas déjà le cas
			niveau.classe = classe;
			niveau = await repo.save(niveau);
		}
		return niveau;
	}

	// Check import (validate file without saving)
	async checkImport(
		fileBuffer: Buffer,
		tenantId?: number,
	): Promise<CheckImportResultDto> {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer as any);
		const sheets: CheckImportResultSheetDto[] = [];

		// Pre-load all niveaux and classes for efficient lookup
		const allNiveaux = await this.niveauRepository.find();
		const allClasses = await this.classeRepository.find({
			relations: { etablissement: true },
		});
		const niveauMap = new Map(
			allNiveaux.map((n) => [n.name.toLowerCase().trim(), n]),
		);

		for (const worksheet of workbook.worksheets) {
			const acronyme = worksheet.name;
			let etablissement: Etablissement | null = null;

			if (tenantId) {
				// Admin: use their establishment regardless of sheet name
				etablissement = await this.etablissementRepository.findOne({
					where: { id: tenantId },
				});
			} else {
				// Super_admin: find by sheet acronyme
				etablissement = await this.etablissementRepository.findOne({
					where: { acronyme },
				});
			}

			// Get and map headers
			const headerRow = worksheet.getRow(1);
			const headers: string[] = [];
			headerRow.eachCell((cell, colNumber) => {
				headers.push(cell.text?.trim() || `Colonne ${colNumber}`);
			});
			const headerMap = this.mapHeaders(headers);
			const hasParcours = 'parcours' in headerMap;
			const hasClasse = 'classe' in headerMap;

			// Count data rows and collect unique niveau/parcours pairs
			let nombreLignes = 0;
			const niveauNoms = new Set<string>();
			const uniquePairs = new Map<
				string,
				{ niveauNom: string; classeNom: string }
			>();

			for (let i = 2; i <= worksheet.rowCount; i++) {
				const row = worksheet.getRow(i);
				if (!row.hasValues) continue;
				nombreLignes++;

				const getCellText = (field: string): string | undefined => {
					if (!(field in headerMap)) return undefined;
					const cell = row.getCell(headerMap[field] + 1);
					const val = cell.value;
					return val ? String(val).trim() : undefined;
				};

				let niveauNom = getCellText('niveau');
				if (!niveauNom && hasClasse && !hasParcours) {
					niveauNom = getCellText('classe');
				}
				if (!niveauNom) continue;

				niveauNoms.add(niveauNom);

				if (hasParcours) {
					const parcoursNom = getCellText('parcours');
					if (parcoursNom) {
						uniquePairs.set(`${niveauNom}|${parcoursNom}`, {
							niveauNom,
							classeNom: parcoursNom,
						});
					}
				}
			}

			// Detect missing niveaux and classes
			const niveauxManquants: string[] = [];
			const classesManquantes: MissingClasseDto[] = [];
			const etabId = etablissement?.id;

			for (const niveauNom of niveauNoms) {
				const existingNiveau = niveauMap.get(niveauNom.toLowerCase().trim());

				if (!existingNiveau) {
					niveauxManquants.push(niveauNom);
					// All classes for this missing niveau are also missing
					if (hasParcours) {
						for (const pair of uniquePairs.values()) {
							if (pair.niveauNom === niveauNom) {
								classesManquantes.push(pair);
							}
						}
					} else {
						classesManquantes.push({
							niveauNom,
							classeNom: `${niveauNom} - Parcours unique`,
						});
					}
				} else {
					// Niveau exists — check associated classes in this establishment
					if (hasParcours) {
						for (const pair of uniquePairs.values()) {
							if (pair.niveauNom !== niveauNom) continue;
							const exists = allClasses.some(
								(c) =>
									c.name.toLowerCase().trim() ===
										pair.classeNom.toLowerCase().trim() &&
									(!etabId || c.etablissement?.id === etabId),
							);
							if (!exists) classesManquantes.push(pair);
						}
					} else {
						const defaultName = `${niveauNom} - Parcours unique`;
						const exists = allClasses.some(
							(c) =>
								c.name.toLowerCase().trim() === defaultName.toLowerCase() &&
								(!etabId || c.etablissement?.id === etabId),
						);
						if (!exists)
							classesManquantes.push({ niveauNom, classeNom: defaultName });
					}
				}
			}

			sheets.push({
				acronyme: etablissement?.acronyme || acronyme,
				existeDeja: !!etablissement,
				nombreLignes,
				headers,
				niveauxManquants,
				classesManquantes,
			});
		}

		return { sheets };
	}

	// Run import
	async runImport(
		fileBuffer: Buffer,
		runDto: RunImportDto,
		tenantId?: number,
	): Promise<ImportReportDto> {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(fileBuffer as any);
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		const feuilles: ImportReportSheetDto[] = [];
		let totalEtudiantsImportes = 0;
		let totalErreurs = 0;

		// For admin (tenantId set), pre-load their establishment once
		let adminEtablissement: Etablissement | null = null;
		if (tenantId) {
			adminEtablissement = await this.etablissementRepository.findOne({
				where: { id: tenantId },
			});
		}

		try {
			// First, create any new establishments (super_admin only)
			const etabMap = new Map<string, Etablissement>();

			// Load existing establishments
			const existingEtabs = await this.etablissementRepository.find();
			existingEtabs.forEach((etab) => {
				if (etab.acronyme) etabMap.set(etab.acronyme, etab);
			});

			// Create new establishments (ignored for admin since tenant is fixed)
			if (!tenantId && runDto.etablissementsACreer) {
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
						!tenantId &&
						!existingEtabs.find((e) => e.acronyme === acronyme) &&
						!!runDto.etablissementsACreer?.find((e) => e.acronyme === acronyme),
				};

				// Admin: always use their establishment. Super_admin: use sheet name
				const etablissement = tenantId
					? adminEtablissement
					: etabMap.get(acronyme);

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
						const sexe = this.normalizeGender(getCellText('sexe'));
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

						// Resolve niveau name
						let niveauName = getCellText('niveau');
						if (!niveauName && hasClasse && !hasParcours) {
							niveauName = getCellText('classe');
						}
						if (!niveauName) {
							throw new Error(`Ligne ${i}: Niveau ou classe obligatoire`);
						}

						// 1. Résoudre la Classe (parcours) EN PREMIER — elle n'a pas besoin du Niveau
						let classe: Classe;
						if (hasParcours) {
							const parcoursName = getCellText('parcours');
							if (!parcoursName)
								throw new Error(`Ligne ${i}: Parcours obligatoire`);
							classe = await this.findOrCreateClasse(
								parcoursName,
								etablissement,
								queryRunner,
							);
						} else {
							// Pas de colonne parcours : parcours unique par niveau
							classe = await this.findOrCreateClasse(
								`${niveauName} - Parcours unique`,
								etablissement,
								queryRunner,
							);
						}

						// 2. Résoudre le Niveau AVEC la Classe déjà connue
						const niveau = await this.findOrCreateNiveau(
							niveauName,
							classe,
							etablissement,
							queryRunner,
						);

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
