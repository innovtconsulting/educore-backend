import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository, SelectQueryBuilder } from 'typeorm';
import { DemiJournee, Presence, PresenceStatus } from './entities/presence.entity';
import { BulkRecordPresenceDto } from './dto/record-presence.dto';
import { BulkRecordHalfDayPresenceDto, HalfDayPresenceFilterDto } from './dto/bulk-record-halfday.dto';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PresenceFilterDto } from './dto/presence-filter.dto';
import { Role } from '../user/entities/user.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { ParentService } from '../parent/parent.service';

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(EmploiDuTemp)
    private readonly emploiRepo: Repository<EmploiDuTemp>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepo: Repository<Etudiant>,
    @InjectRepository(Classe)
    private readonly classeRepo: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepo: Repository<Niveau>,
    private readonly parentService: ParentService,
  ) {}

  async bulkRecord(
    dto: BulkRecordPresenceDto,
    tenantId?: number,
  ): Promise<Presence[]> {
    const { emploiDuTempId, items } = dto;

    const emploi = await this.emploiRepo.findOne({
      where: TenantHelper.addTenantFilter({ id: emploiDuTempId }, tenantId),
      relations: {
        classe: true,
        niveau: true,
        matiere: true,
        etablissement: true,
      },
    });
    if (!emploi)
      throw new NotFoundException(`Créneau #${emploiDuTempId} introuvable`);

    const finalEtablissementId = tenantId || emploi.etablissement.id;
    const results: Presence[] = [];

    for (const item of items) {
      const etudiant = await this.etudiantRepo.findOne({
        where: TenantHelper.addTenantFilter({ id: item.etudiantId }, tenantId),
        relations: {
          classe: true,
          niveau: true,
          parents: true,
          etablissement: true,
        },
      });

      if (!etudiant) {
        throw new NotFoundException(`Étudiant #${item.etudiantId} introuvable`);
      }

      // Vérifier si l'étudiant appartient à la classe/niveau du cours
      if (
        etudiant.classe.id !== emploi.classe.id ||
        etudiant.niveau.id !== emploi.niveau.id
      ) {
        throw new BadRequestException(
          `L'étudiant ${etudiant.firstName} ${etudiant.lastName} n'appartient pas à cette classe/niveau`,
        );
      }

      let presence = await this.presenceRepository.findOne({
        where: {
          etudiant: { id: etudiant.id },
          emploiDuTemp: { id: emploi.id },
        },
      });

      if (presence) {
        presence.status = item.status;
        presence.remark = item.remark;
      } else {
        presence = this.presenceRepository.create({
          etudiant,
          emploiDuTemp: emploi,
          etablissementId: finalEtablissementId,
          status: item.status,
          remark: item.remark,
        });
      }
      const savedPresence = await this.presenceRepository.save(presence);
      results.push(savedPresence);
    }

    return results;
  }

  async findAll(filterDto: PresenceFilterDto, tenantId?: number) {
    const { page = 1, limit = 15, classeId, niveauId, status } = filterDto;
    const skip = (page - 1) * limit;
    const where = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiant.etablissement',
    ) as any;

    if (classeId) {
      where.emploiDuTemp = {
        ...(where.emploiDuTemp || {}),
        classe: { id: classeId },
      };
    }
    if (niveauId) {
      where.emploiDuTemp = {
        ...(where.emploiDuTemp || {}),
        niveau: { id: niveauId },
      };
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.presenceRepository.findAndCount({
      where: where,
      relations: {
        etudiant: true,
        emploiDuTemp: { matiere: true, classe: true, niveau: true },
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

  async findBySession(
    emploiDuTempId: number,
    tenantId?: number,
  ): Promise<Presence[]> {
    const where: any = { emploiDuTemp: { id: emploiDuTempId } };
    if (tenantId) where.etudiant = { etablissement: { id: tenantId } };

    return await this.presenceRepository.find({
      where,
      relations: { etudiant: true },
    });
  }

  async getStudentStats(etudiantId: number, user?: any, tenantId?: number) {
    if (user && user.role === Role.ETUDIANT && user.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres statistiques de présence',
      );
    }

    if (user && user.role === Role.PARENT) {
      await this.parentService.assertParentOfEtudiant(
        user.parentId,
        etudiantId,
      );
    }

    const resolvedTenantId = TenantHelper.resolveTenantId(user, tenantId);
    const where: any = { etudiant: { id: etudiantId } };
    if (resolvedTenantId) {
      where.etudiant.etablissement = { id: resolvedTenantId };
    }

    const presences = await this.presenceRepository.find({
      where,
      relations: { emploiDuTemp: { matiere: true } },
    });

    const total = presences.length;
    const presents = presences.filter(
      (p) => p.status === PresenceStatus.PRESENT,
    ).length;
    const absents = presences.filter(
      (p) => p.status === PresenceStatus.ABSENT,
    ).length;
    const retards = presences.filter(
      (p) => p.status === PresenceStatus.RETARD,
    ).length;

    return {
      total,
      presents,
      absents,
      retards,
      history: presences,
    };
  }

  async getSessionsSummary(filterDto: PresenceFilterDto, tenantId?: number) {
    const {
      page = 1,
      limit = 15,
      classeId,
      niveauId,
      matiereId,
      startDate,
      endDate,
    } = filterDto;
    const skip = (page - 1) * limit;

    const base = (): SelectQueryBuilder<Presence> => {
      const qb = this.presenceRepository
        .createQueryBuilder('p')
        .leftJoin('p.emploiDuTemp', 'e')
        .leftJoin('e.matiere', 'm')
        .leftJoin('e.classe', 'c')
        .leftJoin('e.niveau', 'nv');
      if (tenantId) qb.andWhere('p.etablissementId = :tenantId', { tenantId });
      if (classeId) qb.andWhere('c.id = :classeId', { classeId });
      if (niveauId) qb.andWhere('nv.id = :niveauId', { niveauId });
      if (matiereId) qb.andWhere('m.id = :matiereId', { matiereId });
      if (startDate)
        qb.andWhere('e.startTime >= :startDate', {
          startDate: new Date(startDate),
        });
      if (endDate)
        qb.andWhere('e.startTime <= :endDate', { endDate: new Date(endDate) });
      return qb;
    };

    const [rawItems, countResult] = await Promise.all([
      base()
        .select('e.id', 'sessionId')
        .addSelect('e.startTime', 'startTime')
        .addSelect('e.endTime', 'endTime')
        .addSelect('m.name', 'matiereName')
        .addSelect('c.id', 'classeId')
        .addSelect('c.name', 'classeName')
        .addSelect('nv.id', 'niveauId')
        .addSelect('nv.name', 'niveauName')
        .addSelect('COUNT(p.id)', 'total')
        .addSelect(
          `SUM(CASE WHEN p.status = '${PresenceStatus.PRESENT}' THEN 1 ELSE 0 END)`,
          'presents',
        )
        .addSelect(
          `SUM(CASE WHEN p.status = '${PresenceStatus.ABSENT}' THEN 1 ELSE 0 END)`,
          'absents',
        )
        .addSelect(
          `SUM(CASE WHEN p.status = '${PresenceStatus.RETARD}' THEN 1 ELSE 0 END)`,
          'retards',
        )
        .groupBy('e.id')
        .addGroupBy('e.startTime')
        .addGroupBy('e.endTime')
        .addGroupBy('m.name')
        .addGroupBy('c.id')
        .addGroupBy('c.name')
        .addGroupBy('nv.id')
        .addGroupBy('nv.name')
        .orderBy('e.startTime', 'DESC')
        .offset(skip)
        .limit(limit)
        .getRawMany(),
      base().select('COUNT(DISTINCT e.id)', 'count').getRawOne(),
    ]);

    const total = parseInt(countResult?.count ?? '0', 10);

    return {
      items: rawItems.map((r) => ({
        sessionId: Number(r.sessionId),
        startTime: r.startTime,
        endTime: r.endTime,
        matiereName: r.matiereName || '',
        classeId: Number(r.classeId),
        classeName: r.classeName || '',
        niveauId: Number(r.niveauId),
        niveauName: r.niveauName || '',
        total: Number(r.total),
        presents: Number(r.presents),
        absents: Number(r.absents),
        retards: Number(r.retards),
      })),
      total,
      page,
      limit,
    };
  }

  async getStudentAbsencesToday(
    etudiantId: number,
    tenantId?: number,
  ): Promise<Presence[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      etudiant: { id: etudiantId },
      status: PresenceStatus.ABSENT,
    };
    // chercher à la fois les absences par créneau et demi-journée
    const todayStr = today.toISOString().split('T')[0];
    if (tenantId) {
      where.etudiant.etablissement = { id: tenantId };
    }

    // On récupère les deux types : présence liée à emploiDuTemp OU demi-journée
    const qb = this.presenceRepository
      .createQueryBuilder('p')
      .leftJoin('p.emploiDuTemp', 'e')
      .leftJoin('p.etudiant', 'et')
      .where('p.etudiantId = :etudiantId', { etudiantId })
      .andWhere('p.status = :status', { status: PresenceStatus.ABSENT });
    if (tenantId) qb.andWhere('et.etablissementId = :tenantId', { tenantId });
    qb.andWhere(
      '( (e.startTime BETWEEN :today AND :tomorrow) OR (p.date = :todayStr) )',
      { today, tomorrow, todayStr },
    );
    return qb.getMany();
  }

  // ────────────────────────────────────────────────────────────────
  // Mode Chérubin : demi-journée (primaire) – pas par matière
  // ────────────────────────────────────────────────────────────────
  async bulkRecordHalfDay(
    dto: BulkRecordHalfDayPresenceDto,
    tenantId?: number,
  ): Promise<Presence[]> {
    const { classeId, niveauId, date, demiJournee, items } = dto;

    const classe = await this.classeRepo.findOne({
      where: TenantHelper.addTenantFilter({ id: classeId }, tenantId),
    });
    if (!classe) throw new NotFoundException(`Classe #${classeId} introuvable`);
    const niveau = await this.niveauRepo.findOne({
      where: TenantHelper.addTenantFilter({ id: niveauId }, tenantId),
      relations: { classe: true },
    });
    if (!niveau) throw new NotFoundException(`Niveau #${niveauId} introuvable`);
    if (niveau.classe.id !== classe.id) {
      throw new BadRequestException("Le niveau n'appartient pas à la classe");
    }

    const finalEtablissementId = tenantId || (classe as any).etablissementId || niveau.classe.etablissement?.id;
    // fallback : récupérer via classe si besoin
    let etablissementId = tenantId;
    if (!etablissementId) {
      const fullClasse = await this.classeRepo.findOne({ where: { id: classeId }, relations: { etablissement: true } });
      etablissementId = fullClasse?.etablissement?.id;
    }
    if (!etablissementId) throw new BadRequestException("Établissement introuvable pour cette classe");

    const results: Presence[] = [];
    for (const item of items) {
      const etudiant = await this.etudiantRepo.findOne({
        where: TenantHelper.addTenantFilter({ id: item.etudiantId }, tenantId),
        relations: { classe: true, niveau: true, etablissement: true },
      });
      if (!etudiant) throw new NotFoundException(`Étudiant #${item.etudiantId} introuvable`);
      if (etudiant.classe.id !== classeId || etudiant.niveau.id !== niveauId) {
        throw new BadRequestException(
          `L'étudiant ${etudiant.firstName} ${etudiant.lastName} n'appartient pas à cette classe/niveau`,
        );
      }

      let presence = await this.presenceRepository.findOne({
        where: {
          etudiant: { id: etudiant.id },
          date,
          demiJournee,
        },
      });
      if (presence) {
        presence.status = item.status;
        presence.remark = item.remark;
      } else {
        presence = this.presenceRepository.create({
          etudiant,
          date,
          demiJournee,
          classeId,
          niveauId,
          classe,
          niveau,
          emploiDuTemp: null,
          etablissementId: etablissementId!,
          status: item.status,
          remark: item.remark,
        });
      }
      const saved = await this.presenceRepository.save(presence);
      results.push(saved);
    }
    return results;
  }

  async findByHalfDay(
    classeId: number,
    niveauId: number,
    date: string,
    demiJournee: DemiJournee,
    tenantId?: number,
  ): Promise<Presence[]> {
    const where: any = { classeId, niveauId, date, demiJournee };
    if (tenantId) where.etablissementId = tenantId;
    return this.presenceRepository.find({ where, relations: { etudiant: true, classe: true, niveau: true } });
  }

  async getHalfDaySessionsSummary(
    filter: HalfDayPresenceFilterDto & PaginationQueryDto,
    tenantId?: number,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 15, classeId, niveauId, date, demiJournee } = filter as any;
    const skip = (page - 1) * limit;

    const qb = this.presenceRepository
      .createQueryBuilder('p')
      .leftJoin('p.classe', 'c')
      .leftJoin('p.niveau', 'nv')
      .where('p.date IS NOT NULL');

    if (tenantId) qb.andWhere('p.etablissementId = :tenantId', { tenantId });
    if (classeId) qb.andWhere('p.classeId = :classeId', { classeId });
    if (niveauId) qb.andWhere('p.niveauId = :niveauId', { niveauId });
    if (date) qb.andWhere('p.date = :date', { date });
    if (demiJournee) qb.andWhere('p.demiJournee = :demiJournee', { demiJournee });

    // Group by date + demiJournee + classe + niveau
    const baseQb = () => qb.clone();

    const [rawItems, countResult] = await Promise.all([
      baseQb()
        .select('p.date', 'date')
        .addSelect('p.demiJournee', 'demiJournee')
        .addSelect('c.id', 'classeId')
        .addSelect('c.name', 'classeName')
        .addSelect('nv.id', 'niveauId')
        .addSelect('nv.name', 'niveauName')
        .addSelect('COUNT(p.id)', 'total')
        .addSelect(`SUM(CASE WHEN p.status = '${PresenceStatus.PRESENT}' THEN 1 ELSE 0 END)`, 'presents')
        .addSelect(`SUM(CASE WHEN p.status = '${PresenceStatus.ABSENT}' THEN 1 ELSE 0 END)`, 'absents')
        .addSelect(`SUM(CASE WHEN p.status = '${PresenceStatus.RETARD}' THEN 1 ELSE 0 END)`, 'retards')
        .groupBy('p.date')
        .addGroupBy('p.demiJournee')
        .addGroupBy('c.id')
        .addGroupBy('c.name')
        .addGroupBy('nv.id')
        .addGroupBy('nv.name')
        .orderBy('p.date', 'DESC')
        .addOrderBy('p.demiJournee', 'ASC')
        .offset(skip)
        .limit(limit)
        .getRawMany(),
      baseQb()
        .select('COUNT(DISTINCT (p.date || p.demiJournee || p.classeId || p.niveauId))', 'count')
        .getRawOne(),
    ]);

    const total = parseInt(countResult?.count ?? '0', 10);
    return {
      items: rawItems.map((r: any) => ({
        date: r.date,
        demiJournee: r.demiJournee,
        classeId: Number(r.classeId),
        classeName: r.classeName || '',
        niveauId: Number(r.niveauId),
        niveauName: r.niveauName || '',
        total: Number(r.total),
        presents: Number(r.presents),
        absents: Number(r.absents),
        retards: Number(r.retards),
      })),
      total,
      page,
      limit,
    };
  }
}
