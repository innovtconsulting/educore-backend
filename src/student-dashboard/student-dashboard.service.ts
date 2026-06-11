import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NoteService } from '../note/note.service';
import { PresenceService } from '../presence/presence.service';
import { DevoirService } from '../devoir/devoir.service';
import { EmploiDuTempsService } from '../emploi-du-temps/emploi-du-temps.service';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Repository } from 'typeorm';

@Injectable()
export class StudentDashboardService {
  constructor(
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    private readonly noteService: NoteService,
    private readonly presenceService: PresenceService,
    private readonly devoirService: DevoirService,
    private readonly emploiService: EmploiDuTempsService,
  ) {}

  async getDashboardData(user: any) {
    const etudiantId = user.etudiantId;
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { classe: true, niveau: true },
    });
    if (!etudiant) throw new NotFoundException('Profil étudiant non trouvé');

    const [notes, presenceStats, upcomingHomework, schedule] = await Promise.all([
      this.noteService.findAll({ page: 1, limit: 5 }, user),
      this.presenceService.getStudentStats(etudiantId, user),
      this.devoirService.findByClasse(etudiant.classe.id, etudiant.niveau.id),
      this.emploiService.findAll({ page: 1, limit: 10 }, etudiant.classe.id, etudiant.niveau.id),
    ]);

    return {
      student: {
        id: etudiant.id,
        fullName: `${etudiant.firstName} ${etudiant.lastName}`,
        classe: etudiant.classe.name,
        niveau: etudiant.niveau.name,
      },
      recentNotes: notes.items,
      presence: {
        absents: presenceStats.absents,
        retards: presenceStats.retards,
      },
      upcomingHomework: upcomingHomework.filter(d => new Date(d.deadline) > new Date()).slice(0, 5),
      todaySchedule: schedule.items,
    };
  }
}
