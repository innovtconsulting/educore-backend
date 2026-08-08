import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../note/entities/note.entity';
import { Presence, PresenceStatus } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { Paiement } from '../finance/entities/paiement.entity';
import { Devoir } from '../devoir/entities/devoir.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(Sanction)
    private readonly sanctionRepository: Repository<Sanction>,
    @InjectRepository(Paiement)
    private readonly paiementRepository: Repository<Paiement>,
    @InjectRepository(Devoir)
    private readonly devoirRepository: Repository<Devoir>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
  ) {}

  async getActivities(etudiantId: number, limit = 20) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { classe: true },
    });
    if (!etudiant) {
      throw new NotFoundException('Étudiant introuvable');
    }

    const [notes, presences, sanctions, paiements, devoirs] = await Promise.all([
      this.noteRepository.find({
        where: { etudiant: { id: etudiantId } },
        relations: { evaluation: { matiere: true } },
        order: { createdAt: 'DESC' as const },
        take: limit,
      }),
      this.presenceRepository.find({
        where: { etudiant: { id: etudiantId } },
        relations: { emploiDuTemp: { matiere: true } },
        order: { id: 'DESC' as const },
        take: limit,
      }),
      this.sanctionRepository.find({
        where: { etudiant: { id: etudiantId } },
        order: { dateDecision: 'DESC' as const },
        take: limit,
      }),
      this.paiementRepository.find({
        where: { etudiant: { id: etudiantId } },
        relations: { facture: true },
        order: { datePaiement: 'DESC' as const },
        take: limit,
      }),
      this.devoirRepository.find({
        where: { classes: { id: etudiant.classe?.id } },
        relations: { matiere: true },
        order: { createdAt: 'DESC' as const },
        take: limit,
      }),
    ]);

    const activities: ActivityItem[] = [];

    notes.forEach((n) => {
      activities.push({
        id: `note-${n.id}`,
        type: 'note',
        title: 'Nouvelle note',
        description: `${n.evaluation?.matiere?.name ?? 'Matière'}: ${n.value}/20`,
        date: n.createdAt.toISOString(),
        color: '#3B82F6',
      });
    });

    presences.forEach((p) => {
      const isAbsent = p.status === PresenceStatus.ABSENT || p.status === PresenceStatus.RETARD;
      activities.push({
        id: `presence-${p.id}`,
        type: 'presence',
        title: isAbsent ? 'Absence signalée' : 'Présence enregistrée',
        description: `${p.emploiDuTemp?.matiere?.name ?? 'Cours'} - ${p.status}`,
        date: p.createdAt.toISOString(),
        color: isAbsent ? '#EF4444' : '#10B981',
      });
    });

    sanctions.forEach((s) => {
      activities.push({
        id: `sanction-${s.id}`,
        type: 'sanction',
        title: 'Mesure disciplinaire',
        description: `${s.type} - ${s.motif ?? ''}`,
        date: new Date(s.dateDecision).toISOString(),
        color: '#F59E0B',
      });
    });

    paiements.forEach((p) => {
      activities.push({
        id: `paiement-${p.id}`,
        type: 'paiement',
        title: 'Paiement écolage',
        description: `Facture ${p.facture?.numero ?? 'N/A'} - ${new Intl.NumberFormat('fr-FR').format(Number(p.montant))} Ar`,
        date: p.datePaiement.toISOString(),
        color: '#10B981',
      });
    });

    devoirs.forEach((d) => {
      activities.push({
        id: `devoir-${d.id}`,
        type: 'devoir',
        title: d.title ?? 'Devoir à rendre',
        description: `${d.matiere?.name ?? ''} - Échéance ${d.deadline ? new Date(d.deadline).toLocaleDateString('fr-FR') : 'N/A'}`,
        date: (d.createdAt ?? new Date()).toISOString(),
        color: '#8B5CF6',
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return activities.slice(0, limit);
  }
}

export interface ActivityItem {
  id: string;
  type: 'note' | 'presence' | 'sanction' | 'paiement' | 'devoir';
  title: string;
  description: string;
  date: string;
  color: string;
}
