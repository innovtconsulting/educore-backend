import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Presence, PresenceStatus } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from './entities/daily-report.entity';
import { SubmitDailyReportDto } from './dto/submit-daily-report.dto';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(Sanction)
    private readonly sanctionRepository: Repository<Sanction>,
    @InjectRepository(DailyReport)
    private readonly dailyReportRepository: Repository<DailyReport>,
  ) {}

  async getDailySupervisorReport(date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

    // Récupérer les présences (Absences et Retards) de la journée
    const presences = await this.presenceRepository.find({
      where: {
        emploiDuTemp: {
          startTime: Between(startOfDay, endOfDay),
        },
      },
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
    const sanctions = await this.sanctionRepository.find({
      where: {
        dateDecision: targetDate,
      },
      relations: {
        etudiant: { classe: true, niveau: true },
      },
    });

    // Vérifier si un rapport est déjà soumis
    const savedReport = await this.dailyReportRepository.findOne({
      where: { date },
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
    const reportData = await this.getDailySupervisorReport(dto.date);

    let report = await this.dailyReportRepository.findOne({
      where: { date: dto.date },
    });

    if (!report) {
      report = this.dailyReportRepository.create({
        date: dto.date,
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

  async getAllDailyReports() {
    return await this.dailyReportRepository.find({
      order: { date: 'DESC' },
    });
  }

  async getDailyReportById(id: number) {
    const report = await this.dailyReportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(
        `Rapport quotidien avec l'ID ${id} non trouvé`,
      );
    }
    return report;
  }
}
