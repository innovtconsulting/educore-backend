import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { Facture, InvoiceStatus } from '../finance/entities/facture.entity';
import { User, Role } from '../user/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Facture)
    private readonly factureRepository: Repository<Facture>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findForUser(authUser: any) {
    await this.syncOverdueTuitionNotificationsForUser(authUser);

    return await this.notificationRepository.find({
      where: { recipient: { id: authUser.id } },
      relations: {
        facture: {
          etudiant: true,
        },
      },
      order: {
        isRead: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async markAsRead(id: number, authUser: any) {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipient: { id: authUser.id } },
      relations: { recipient: true },
    });

    if (!notification) {
      throw new NotFoundException(`Notification #${id} introuvable`);
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  async syncOverdueTuitionNotificationsForUser(authUser: any) {
    const recipient = await this.userRepository.findOne({
      where: { id: authUser.id },
      relations: {
        etudiant: true,
        parent: {
          etudiants: true,
        },
      },
    });

    if (!recipient) return;

    const etudiantIds = this.getRelatedStudentIds(recipient, authUser);
    if (etudiantIds.length === 0) return;

    const overdueFactures = await this.findOverdueFactures(etudiantIds);

    for (const facture of overdueFactures) {
      await this.createOverdueNotificationIfNeeded(recipient, facture);
    }
  }

  private getRelatedStudentIds(recipient: User, authUser: any) {
    if (recipient.role === Role.ETUDIANT || authUser.role === Role.ETUDIANT) {
      const etudiantId = recipient.etudiant?.id || authUser.etudiantId;
      return etudiantId ? [etudiantId] : [];
    }

    if (recipient.role === Role.PARENT || authUser.role === Role.PARENT) {
      const parentStudents = recipient.parent?.etudiants || [];
      return parentStudents.map((etudiant) => etudiant.id).filter(Boolean);
    }

    return [];
  }

  private async findOverdueFactures(etudiantIds: number[]) {
    const today = new Date().toISOString().slice(0, 10);

    const factures = await this.factureRepository
      .createQueryBuilder('facture')
      .leftJoinAndSelect('facture.etudiant', 'etudiant')
      .leftJoinAndSelect('facture.paiements', 'paiements')
      .where('etudiant.id IN (:...etudiantIds)', { etudiantIds })
      .andWhere('facture.dateEcheance IS NOT NULL')
      .andWhere('facture.dateEcheance < :today', { today })
      .andWhere('facture.status IN (:...statuses)', {
        statuses: [InvoiceStatus.VALIDE, InvoiceStatus.PARTIEL],
      })
      .orderBy('facture.dateEcheance', 'ASC')
      .getMany();

    return factures.filter((facture) => {
      const paidAmount = (facture.paiements || []).reduce(
        (sum, paiement) => sum + Number(paiement.montant || 0),
        0,
      );
      return paidAmount < Number(facture.montantTotal || 0);
    });
  }

  private async createOverdueNotificationIfNeeded(
    recipient: User,
    facture: Facture,
  ) {
    const dedupeKey = `${NotificationType.ECOLAGE_RETARD}:${recipient.id}:${facture.id}`;
    const existing = await this.notificationRepository.findOne({
      where: { dedupeKey },
    });

    if (existing) return existing;

    const notification = this.notificationRepository.create({
      title: 'Retard de paiement',
      message:
        'Votre écolage est en retard. Veuillez régulariser votre paiement.',
      type: NotificationType.ECOLAGE_RETARD,
      isRead: false,
      dedupeKey,
      recipient,
      facture,
    });

    try {
      return await this.notificationRepository.save(notification);
    } catch (error: any) {
      if (error?.code === '23505') {
        return await this.notificationRepository.findOne({
          where: { dedupeKey },
        });
      }
      throw error;
    }
  }
}
