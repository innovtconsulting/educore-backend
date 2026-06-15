import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Presence, PresenceStatus } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from './entities/daily-report.entity';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Facture } from '../finance/entities/facture.entity';
import { Paiement } from '../finance/entities/paiement.entity';
import { TenantContext } from '../common/tenant/tenant.context';
import { TenantHelper } from '../common/tenant/tenant.helper';

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
    @InjectRepository(Facture)
    private readonly factureRepository: Repository<Facture>,
    @InjectRepository(Paiement)
    private readonly paiementRepository: Repository<Paiement>,
  ) {}

  async getGlobalStats() {
    const tenantId = TenantContext.getTenantId();

    const [totalEtudiants, totalEnseignants, totalClasses] = await Promise.all([
      this.etudiantRepository.count({
        where: TenantHelper.addTenantFilter({}, tenantId) as any,
      }),
      this.enseignantRepository.count({
        where: tenantId ? { affectations: { etablissement: { id: tenantId } } } : {},
      }),
      this.classeRepository.count({
        where: TenantHelper.addTenantFilter({}, tenantId, 'etablissements') as any,
      }),
    ]);

    const financialQuery = this.factureRepository.createQueryBuilder('f');
    if (tenantId) {
      financialQuery.innerJoin('f.etudiant', 'e').andWhere('e.etablissementId = :tenantId', { tenantId });
    }
    const financialStats = await financialQuery
      .select('SUM(f.montantTotal)', 'totalInvoiced')
      .getRawOne();

    const paymentQuery = this.paiementRepository.createQueryBuilder('p');
    if (tenantId) {
      paymentQuery.innerJoin('p.etudiant', 'e').andWhere('e.etablissementId = :tenantId', { tenantId });
    }
    const paymentStats = await paymentQuery
      .select('SUM(p.montant)', 'totalCollected')
      .getRawOne();

    return {
      overview: {
        students: totalEtudiants,
        teachers: totalEnseignants,
        classes: totalClasses,
      },
      finance: {
        totalInvoiced: parseFloat(financialStats.totalInvoiced || 0),
        totalCollected: parseFloat(paymentStats.totalCollected || 0),
        pending: parseFloat(financialStats.totalInvoiced || 0) - parseFloat(paymentStats.totalCollected || 0),
      },
    };
  }

  async getDailySupervisorReport(date: string) {
    const tenantId = TenantContext.getTenantId();
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
      where: TenantHelper.addTenantFilter({ date }, tenantId) as any,
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
        matiere: a.emploiDuTemp.matiere.name,
        heure: a.emploiDuTemp.startTime,
        remarque: a.remark,
      })),
      retards: retards.map((r) => ({
        id: r.id,
        etudiant: `${r.etudiant.lastName} ${r.etudiant.firstName}`,
        matricule: r.etudiant.matricule,
        classe: r.etudiant.classe.name,
        niveau: r.etudiant.niveau.name,
        matiere: r.emploiDuTemp.matiere.name,
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

  async submitDailyReport(dto: SubmitDailyReportDto) {
    const tenantId = TenantContext.getTenantId();
    const reportData = await this.getDailySupervisorReport(dto.date);

    let report = await this.dailyReportRepository.findOne({
      where: TenantHelper.addTenantFilter({ date: dto.date }, tenantId) as any,
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

    return await this.dailyReportRepository.save(report);
  }

  async getAllDailyReports(paginationQuery: PaginationQueryDto) {
    const tenantId = TenantContext.getTenantId();
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [items, total] = await this.dailyReportRepository.findAndCount({
      where: TenantHelper.addTenantFilter({}, tenantId) as any,
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

  async getDailyReportById(id: number) {
    const tenantId = TenantContext.getTenantId();
    const report = await this.dailyReportRepository.findOne({
      where: TenantHelper.addTenantFilter({ id }, tenantId) as any,
    });
    if (!report) {
      throw new NotFoundException(
        `Rapport quotidien avec l'ID ${id} non trouvé`,
      );
    }
    return report;
  }
}
