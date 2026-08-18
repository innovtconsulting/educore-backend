import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Presence, PresenceStatus } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from './entities/daily-report.entity';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDailyReportPdf } from './utils/daily-report-pdf-generator';
import {
  Etudiant,
  EnrollmentStatus,
} from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Classe } from '../classe/entities/classe.entity';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { User, Role } from '../user/entities/user.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(Sanction)
    private readonly sanctionRepository: Repository<Sanction>,
    @InjectRepository(DailyReport)
    private readonly dailyReportRepository: Repository<DailyReport>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Enseignant)
    private readonly enseignantRepository: Repository<Enseignant>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
  ) {}

  private async resolveCallerTenantId(
    tenantId?: number,
    caller?: any,
    etablissementIdFilter?: number,
  ): Promise<number | undefined> {
    // Un SUPER_ADMIN peut filtrer les statistiques globales sur un
    // établissement précis (parmi les établissements visibles uniquement —
    // jamais un établissement masqué, même en forçant l'ID dans la requête).
    if (caller?.role === Role.SUPER_ADMIN && etablissementIdFilter) {
      const etab = await this.etablissementRepository.findOneBy({
        id: etablissementIdFilter,
        visible: true,
      });
      if (etab) return etab.id;
    }

    let resolved = tenantId ?? caller?.etablissementId;
    if (!resolved && caller?.sub && caller?.role !== Role.SUPER_ADMIN) {
      const callerUser = await this.userRepository.findOne({ where: { id: caller.sub } });
      resolved = callerUser?.etablissementId;
    }
    return resolved ?? undefined;
  }

  async getGlobalStats(tenantId?: number, caller?: any, etablissementIdFilter?: number) {
    const resolvedTenantId = await this.resolveCallerTenantId(tenantId, caller, etablissementIdFilter);
    const [
      totalEtudiants,
      totalEnseignants,
      totalClasses,
      totalComptables,
      totalSurveillants,
      totalSanctions,
      totalEtablissements,
    ] = await Promise.all([
      this.etudiantRepository.count({
        where: TenantHelper.addVisibleOnlyFilter(
          TenantHelper.addTenantFilter(
            { status: EnrollmentStatus.ACTIF },
            resolvedTenantId,
          ),
          resolvedTenantId,
        ) as any,
      }),
      this.enseignantRepository.count({
        where: TenantHelper.addVisibleOnlyFilter(
          TenantHelper.addTenantFilter({}, resolvedTenantId),
          resolvedTenantId,
        ) as any,
      }),
      this.classeRepository.count({
        where: TenantHelper.addVisibleOnlyFilter(
          TenantHelper.addTenantFilter({}, resolvedTenantId),
          resolvedTenantId,
        ) as any,
      }),
      this.userRepository.count({
        where: TenantHelper.addVisibleOnlyFilter(
          TenantHelper.addTenantFilter(
            { role: Role.COMPTABLE },
            resolvedTenantId,
          ),
          resolvedTenantId,
        ) as any,
      }),
      this.userRepository.count({
        where: TenantHelper.addVisibleOnlyFilter(
          TenantHelper.addTenantFilter(
            { role: Role.SURVEILLANT },
            resolvedTenantId,
          ),
          resolvedTenantId,
        ) as any,
      }),
      this.sanctionRepository.count({
        where: TenantHelper.addVisibleOnlyFilter(
          TenantHelper.addTenantFilter({}, resolvedTenantId),
          resolvedTenantId,
        ) as any,
      }),
      resolvedTenantId
        ? 1
        : this.etablissementRepository.count({ where: { visible: true } }),
    ]);

    return {
      teachers: totalEnseignants,
      students: totalEtudiants,
      comptables: totalComptables,
      surveillants: totalSurveillants,
      classes: totalClasses,
      sanctions: totalSanctions,
      etablissements: totalEtablissements,
    };
  }

  async getDailySupervisorReport(date: string, tenantId?: number) {
    const targetDate = new Date(date);
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

    // Récupérer les présences (Absences et Retards) de la journée
    const presenceWhere: any = {
      emploiDuTemp: {
        startTime: Between(startOfDay, endOfDay),
      },
    };
    if (tenantId) presenceWhere.etudiant = { etablissement: { id: tenantId } };

    const presences = await this.presenceRepository.find({
      where: presenceWhere,
      relations: {
        etudiant: { classe: true, niveau: true },
        emploiDuTemp: { matiere: true },
      },
    });

    const absences = presences.filter(
      (p) => p.status === PresenceStatus.ABSENT,
    );
    const retards = presences.filter((p) => p.status === PresenceStatus.RETARD);

    // Récupérer les sanctions de la journée
    const sanctionWhere: any = { dateDecision: targetDate };
    if (tenantId) sanctionWhere.etudiant = { etablissement: { id: tenantId } };

    const sanctions = await this.sanctionRepository.find({
      where: sanctionWhere,
      relations: {
        etudiant: { classe: true, niveau: true },
      },
    });

    // Vérifier si un rapport est déjà soumis
    const savedReport = await this.dailyReportRepository.findOne({
      where: TenantHelper.addTenantFilter({ date }, tenantId),
    });

    return {
      date: date,
      summary: {
        totalAbsences: absences.length,
        totalRetards: retards.length,
        totalSanctions: sanctions.length,
      },
      isSubmitted: savedReport?.isSubmitted || false,
      savedObservations: savedReport?.observations || null,
      supervisorName: savedReport?.supervisorName || null,
      absences: absences.map((a) => ({
        id: a.id,
        etudiant: `${a.etudiant.lastName} ${a.etudiant.firstName}`,
        matricule: a.etudiant.matricule,
        classe: a.etudiant.classe.name,
        niveau: a.etudiant.niveau.name,
        matiere: a.emploiDuTemp.matiere?.name ?? a.emploiDuTemp.title ?? '',
        heure: a.emploiDuTemp.startTime,
        remarque: a.remark,
      })),
      retards: retards.map((r) => ({
        id: r.id,
        etudiant: `${r.etudiant.lastName} ${r.etudiant.firstName}`,
        matricule: r.etudiant.matricule,
        classe: r.etudiant.classe.name,
        niveau: r.etudiant.niveau.name,
        matiere: r.emploiDuTemp.matiere?.name ?? r.emploiDuTemp.title ?? '',
        heure: r.emploiDuTemp.startTime,
        remarque: r.remark,
      })),
      sanctions: sanctions.map((s) => ({
        id: s.id,
        etudiant: `${s.etudiant.lastName} ${s.etudiant.firstName}`,
        matricule: s.etudiant.matricule,
        type: s.type,
        motif: s.motif,
      })),
    };
  }

  async submitDailyReport(dto: SubmitDailyReportDto, tenantId?: number) {
    const reportData = await this.getDailySupervisorReport(dto.date, tenantId);

    let report = await this.dailyReportRepository.findOne({
      where: TenantHelper.addTenantFilter({ date: dto.date }, tenantId),
    });

    if (!report) {
      report = this.dailyReportRepository.create({
        date: dto.date,
        etablissement: tenantId ? { id: tenantId } : undefined,
      });
    }

    report.supervisorName = dto.supervisorName;
    report.observations = dto.observations;
    report.totalAbsences = reportData.summary.totalAbsences;
    report.totalRetards = reportData.summary.totalRetards;
    report.totalSanctions = reportData.summary.totalSanctions;
    report.isSubmitted = true;

    // Génération du PDF
    const etablissement = tenantId
      ? await this.etudiantRepository.manager
          .getRepository('Etablissement')
          .findOneBy({ id: tenantId })
      : null;

    const pdfUrl = await generateDailyReportPdf({
      ...reportData,
      supervisorName: dto.supervisorName,
      observations: dto.observations,
      etablissement,
    });
    report.pdfUrl = pdfUrl;

    return await this.dailyReportRepository.save(report);
  }

  async getAllDailyReports(
    paginationQuery: PaginationQueryDto,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [items, total] = await this.dailyReportRepository.findAndCount({
      where: TenantHelper.addTenantFilter({}, tenantId),
      skip,
      take: limit,
      order: { date: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getDailyReportById(id: number, tenantId?: number) {
    const report = await this.dailyReportRepository.findOne({
      where: TenantHelper.addTenantFilter({ id }, tenantId),
    });
    if (!report) {
      throw new NotFoundException(
        `Rapport quotidien avec l'ID ${id} non trouvé`,
      );
    }
    return report;
  }
}
