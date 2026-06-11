import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Presence, PresenceStatus } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from '../reporting/entities/daily-report.entity';

@Injectable()
export class LifeDashboardService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(Sanction)
    private readonly sanctionRepository: Repository<Sanction>,
    @InjectRepository(DailyReport)
    private readonly dailyReportRepository: Repository<DailyReport>,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayPresences, recentSanctions, latestReports] = await Promise.all([
      this.presenceRepository.find({
        where: { createdAt: Between(startOfToday, now) },
        relations: { etudiant: true, emploiDuTemp: { matiere: true } },
      }),
      this.sanctionRepository.find({
        take: 5,
        order: { createdAt: 'DESC' },
        relations: { etudiant: true },
      }),
      this.dailyReportRepository.find({
        take: 3,
        order: { date: 'DESC' },
      }),
    ]);

    const absences = todayPresences.filter(p => p.status === PresenceStatus.ABSENT).length;
    const retards = todayPresences.filter(p => p.status === PresenceStatus.RETARD).length;

    return {
      today: {
        date: today,
        absences,
        retards,
      },
      recentSanctions,
      latestReports,
    };
  }
}
