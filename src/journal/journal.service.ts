import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journal } from './entities/journal.entity';
import { JournalAction, JournalHistory } from './entities/journal-history.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { User, Role } from '../user/entities/user.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import {
  JournalFilterDto,
  JournalQuickFilter,
  JournalStatusFilter,
} from './dto/journal-filter.dto';

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(Journal)
    private readonly journalRepository: Repository<Journal>,
    @InjectRepository(JournalHistory)
    private readonly journalHistoryRepository: Repository<JournalHistory>,
    @InjectRepository(EmploiDuTemp)
    private readonly emploiDuTempRepository: Repository<EmploiDuTemp>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
  ) {}

  private resolveDisplayName(user: User): string {
    if (user.enseignant) {
      return `${user.enseignant.firstName} ${user.enseignant.lastName}`;
    }
    if (user.etudiant) {
      return `${user.etudiant.firstName} ${user.etudiant.lastName}`;
    }
    if (user.parent) {
      return `${user.parent.firstName} ${user.parent.lastName}`;
    }
    return user.username || user.email || `Utilisateur #${user.id}`;
  }

  private async loadUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { enseignant: true, etudiant: true, parent: true },
    });
    if (!user) throw new NotFoundException(`Utilisateur #${userId} introuvable`);
    return user;
  }

  private assertOwnership(emploi: EmploiDuTemp, user: any) {
    if (user?.role === Role.ENSEIGNANT && emploi.enseignant?.id !== user.enseignantId) {
      throw new ForbiddenException(
        "Vous ne pouvez gérer le journal que de vos propres créneaux",
      );
    }
  }

  async listSlots(filter: JournalFilterDto, user: any, tenantId?: number) {
    const {
      page = 1,
      limit = 20,
      classeId,
      niveauId,
      matiereId,
      status,
      quickFilter,
      start,
      end,
      search,
    } = filter;
    const skip = (page - 1) * limit;

    const enseignantId =
      user?.role === Role.ENSEIGNANT ? user.enseignantId : filter.enseignantId;

    const base = () => {
      const qb = this.emploiDuTempRepository
        .createQueryBuilder('e')
        .leftJoin('e.matiere', 'matiere')
        .leftJoin('e.enseignant', 'enseignant')
        .leftJoin('e.classe', 'classe')
        .leftJoin('e.niveau', 'niveau')
        .leftJoin('e.salle', 'salle')
        .leftJoin(Journal, 'journal', 'journal.emploiDuTempId = e.id');

      if (tenantId) qb.andWhere('e.etablissementId = :tenantId', { tenantId });
      if (enseignantId)
        qb.andWhere('e.enseignantId = :enseignantId', { enseignantId });
      if (classeId) qb.andWhere('e.classeId = :classeId', { classeId });
      if (niveauId) qb.andWhere('e.niveauId = :niveauId', { niveauId });
      if (matiereId) qb.andWhere('e.matiereId = :matiereId', { matiereId });

      if (start && end) {
        qb.andWhere('e.startTime BETWEEN :start AND :end', {
          start: new Date(start),
          end: new Date(end),
        });
      } else if (quickFilter === JournalQuickFilter.TODAY) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        qb.andWhere('e.startTime BETWEEN :todayStart AND :todayEnd', {
          todayStart,
          todayEnd,
        });
      } else if (quickFilter === JournalQuickFilter.WEEK) {
        const now = new Date();
        const day = now.getDay() === 0 ? 7 : now.getDay(); // lundi = 1 ... dimanche = 7
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        qb.andWhere('e.startTime BETWEEN :weekStart AND :weekEnd', {
          weekStart,
          weekEnd,
        });
      }

      if (status === JournalStatusFilter.NON_RENSEIGNE) {
        qb.andWhere('journal.id IS NULL');
      } else if (status === JournalStatusFilter.RENSEIGNE) {
        qb.andWhere('journal.id IS NOT NULL').andWhere(
          'journal.updatedAt = journal.createdAt',
        );
      } else if (status === JournalStatusFilter.MODIFIE) {
        qb.andWhere('journal.id IS NOT NULL').andWhere(
          'journal.updatedAt > journal.createdAt',
        );
      }

      if (search) {
        qb.andWhere(
          '(matiere.name ILIKE :search OR classe.name ILIKE :search OR journal.title ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      return qb;
    };

    const [rawItems, countResult] = await Promise.all([
      base()
        .select('e.id', 'emploiDuTempId')
        .addSelect('e.startTime', 'startTime')
        .addSelect('e.endTime', 'endTime')
        .addSelect('matiere.name', 'matiereName')
        .addSelect('classe.id', 'classeId')
        .addSelect('classe.name', 'classeName')
        .addSelect('niveau.id', 'niveauId')
        .addSelect('niveau.name', 'niveauName')
        .addSelect('e.title', 'eventTitle')
        .addSelect('salle.name', 'salleName')
        .addSelect('enseignant.id', 'enseignantId')
        .addSelect(
          "enseignant.firstName || ' ' || enseignant.lastName",
          'enseignantName',
        )
        .addSelect('journal.id', 'journalId')
        .addSelect('journal.title', 'journalTitle')
        .addSelect('journal.createdAt', 'journalCreatedAt')
        .addSelect('journal.updatedAt', 'journalUpdatedAt')
        .addSelect('journal.lastModifiedByName', 'lastModifiedByName')
        .orderBy('e.startTime', 'ASC')
        .offset(skip)
        .limit(limit)
        .getRawMany(),
      base().select('COUNT(DISTINCT e.id)', 'count').getRawOne(),
    ]);

    const total = parseInt(countResult?.count ?? '0', 10);

    return {
      items: rawItems.map((r) => {
        let journalStatus: JournalStatusFilter = JournalStatusFilter.NON_RENSEIGNE;
        if (r.journalId) {
          const created = new Date(r.journalCreatedAt).getTime();
          const updated = new Date(r.journalUpdatedAt).getTime();
          journalStatus =
            updated > created
              ? JournalStatusFilter.MODIFIE
              : JournalStatusFilter.RENSEIGNE;
        }
        return {
          emploiDuTempId: Number(r.emploiDuTempId),
          startTime: r.startTime,
          endTime: r.endTime,
          matiereName: r.matiereName || r.eventTitle || '',
          classeId: r.classeId ? Number(r.classeId) : undefined,
          classeName: r.classeName || '',
          niveauId: r.niveauId ? Number(r.niveauId) : undefined,
          niveauName: r.niveauName || '',
          salleName: r.salleName || undefined,
          enseignantId: r.enseignantId ? Number(r.enseignantId) : undefined,
          enseignantName: r.enseignantName || '',
          journalId: r.journalId ? Number(r.journalId) : undefined,
          journalTitle: r.journalTitle || undefined,
          status: journalStatus,
          lastModifiedAt: r.journalId ? r.journalUpdatedAt : undefined,
          lastModifiedByName: r.lastModifiedByName || undefined,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async create(
    dto: CreateJournalDto,
    user: any,
    tenantId?: number,
  ): Promise<Journal> {
    const emploi = await this.emploiDuTempRepository.findOne({
      where: { id: dto.emploiDuTempId },
      relations: { enseignant: true, etablissement: true },
    });
    if (!emploi)
      throw new NotFoundException(`Créneau #${dto.emploiDuTempId} introuvable`);
    if (tenantId && emploi.etablissement.id !== tenantId) {
      throw new NotFoundException(`Créneau #${dto.emploiDuTempId} introuvable`);
    }
    this.assertOwnership(emploi, user);

    const existing = await this.journalRepository.findOne({
      where: { emploiDuTempId: dto.emploiDuTempId },
    });
    if (existing) {
      throw new BadRequestException(
        'Un journal existe déjà pour ce créneau — utilisez la modification',
      );
    }

    const actor = await this.loadUser(user.id);
    const actorName = this.resolveDisplayName(actor);

    const journal = this.journalRepository.create({
      emploiDuTempId: dto.emploiDuTempId,
      title: dto.title,
      content: dto.content,
      objectives: dto.objectives,
      homework: dto.homework,
      remarks: dto.remarks,
      createdById: actor.id,
      createdByName: actorName,
      createdByRole: actor.role,
      lastModifiedById: actor.id,
      lastModifiedByName: actorName,
      lastModifiedByRole: actor.role,
      etablissementId: tenantId || emploi.etablissement.id,
    });
    const saved = await this.journalRepository.save(journal);

    await this.journalHistoryRepository.save(
      this.journalHistoryRepository.create({
        journalId: saved.id,
        action: JournalAction.CREATE,
        performedById: actor.id,
        performedByName: actorName,
        performedByRole: actor.role,
        snapshot: {
          title: saved.title,
          content: saved.content,
          objectives: saved.objectives,
          homework: saved.homework,
          remarks: saved.remarks,
        },
      }),
    );

    return saved;
  }

  async update(
    id: number,
    dto: UpdateJournalDto,
    user: any,
    tenantId?: number,
  ): Promise<Journal> {
    const journal = await this.findOne(id, tenantId);
    this.assertOwnership(journal.emploiDuTemp, user);

    const actor = await this.loadUser(user.id);
    const actorName = this.resolveDisplayName(actor);

    Object.assign(journal, {
      title: dto.title ?? journal.title,
      content: dto.content ?? journal.content,
      objectives: dto.objectives ?? journal.objectives,
      homework: dto.homework ?? journal.homework,
      remarks: dto.remarks ?? journal.remarks,
      lastModifiedById: actor.id,
      lastModifiedByName: actorName,
      lastModifiedByRole: actor.role,
    });
    const saved = await this.journalRepository.save(journal);

    await this.journalHistoryRepository.save(
      this.journalHistoryRepository.create({
        journalId: saved.id,
        action: JournalAction.UPDATE,
        performedById: actor.id,
        performedByName: actorName,
        performedByRole: actor.role,
        snapshot: {
          title: saved.title,
          content: saved.content,
          objectives: saved.objectives,
          homework: saved.homework,
          remarks: saved.remarks,
        },
      }),
    );

    return saved;
  }

  async findOne(id: number, tenantId?: number): Promise<Journal> {
    const journal = await this.journalRepository.findOne({
      where: { id },
      relations: {
        emploiDuTemp: {
          matiere: true,
          enseignant: true,
          classe: true,
          niveau: true,
          salle: true,
          etablissement: true,
        },
      },
    });
    if (!journal) throw new NotFoundException(`Journal #${id} introuvable`);
    if (tenantId && journal.etablissementId !== tenantId) {
      throw new NotFoundException(`Journal #${id} introuvable`);
    }
    return journal;
  }

  async getHistory(
    journalId: number,
    tenantId?: number,
  ): Promise<JournalHistory[]> {
    await this.findOne(journalId, tenantId);
    return this.journalHistoryRepository.find({
      where: { journalId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStudentOverview(
    etudiantId: number,
    tenantId?: number,
  ) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { classe: true, niveau: { matieres: true } },
    });
    if (!etudiant) throw new NotFoundException('Étudiant introuvable');

    const raw = await this.emploiDuTempRepository
      .createQueryBuilder('e')
      .leftJoin('e.matiere', 'matiere')
      .leftJoin('e.enseignant', 'enseignant')
      .leftJoin(Journal, 'journal', 'journal.emploiDuTempId = e.id')
      .where('e.classeId = :classeId', { classeId: etudiant.classe.id })
      .andWhere('journal.id IS NOT NULL')
      .andWhere(tenantId ? 'e.etablissementId = :tenantId' : '1=1', { tenantId })
      .select([
        'e.id AS e_id',
        'e.startTime AS e_start_time',
        'e.endTime AS e_end_time',
        'matiere.id AS matiere_id',
        'matiere.name AS matiere_name',
        'matiere.code AS matiere_code',
        "CONCAT(enseignant.firstName, ' ', enseignant.lastName) AS enseignant_name",
        'journal.id AS journal_id',
        'journal.title AS journal_title',
        'journal.content AS journal_content',
        'journal.objectives AS journal_objectives',
        'journal.homework AS journal_homework',
        'journal.remarks AS journal_remarks',
        'journal.createdAt AS journal_created_at',
        'journal.updatedAt AS journal_updated_at',
      ])
      .orderBy('e.startTime', 'DESC')
      .getRawMany();

    const matiereMap = new Map<number, any>();

    for (const r of raw) {
      const mId = Number(r.matiere_id);
      if (!mId) continue;
      if (!matiereMap.has(mId)) {
        matiereMap.set(mId, {
          matiere: { id: mId, name: r.matiere_name, code: r.matiere_code },
          niveau: { id: etudiant.niveau.id, name: etudiant.niveau.name },
          entries: [],
        });
      }
      matiereMap.get(mId).entries.push({
        id: Number(r.journal_id),
        title: r.journal_title,
        content: r.journal_content,
        objectives: r.journal_objectives || undefined,
        homework: r.journal_homework || undefined,
        remarks: r.journal_remarks || undefined,
        teacherName: r.enseignant_name || '',
        startTime: r.e_start_time,
        endTime: r.e_end_time,
        createdAt: r.journal_created_at,
      });
    }

    return {
      etudiant: {
        id: etudiant.id,
        firstName: etudiant.firstName,
        lastName: etudiant.lastName,
      },
      classe: { id: etudiant.classe.id, name: etudiant.classe.name },
      matieres: Array.from(matiereMap.values()),
    };
  }
}
