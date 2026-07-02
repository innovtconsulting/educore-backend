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
    if (this.canViewAllOverdueNotifications(authUser)) {
      await this.syncAllOverdueTuitionNotifications();
      return await this.findAllOverdueTuitionNotifications();
    }

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

  async checkOverdueTuitionNotifications(authUser: any) {
    if (this.canViewAllOverdueNotifications(authUser)) {
      return await this.syncAllOverdueTuitionNotifications();
    }

    return await this.syncOverdueTuitionNotificationsForUser(authUser);
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
    const notifications: Notification[] = [];

    for (const facture of overdueFactures) {
      const notification = await this.createOverdueNotificationIfNeeded(
        recipient,
        facture,
      );
      if (notification) notifications.push(notification);
    }

    return {
      checkedFactures: overdueFactures.length,
      notifications,
    };
  }

  async syncAllOverdueTuitionNotifications() {
    const overdueFactures = await this.findAllOverdueFactures();
    const notifications: Notification[] = [];

    for (const facture of overdueFactures) {
      const recipients = await this.findRecipientsForFacture(facture);
      for (const recipient of recipients) {
        const notification = await this.createOverdueNotificationIfNeeded(
          recipient,
          facture,
        );
        if (notification) notifications.push(notification);
      }
    }

    return {
      checkedFactures: overdueFactures.length,
      notifications,
    };
  }

  private canViewAllOverdueNotifications(authUser: any) {
    return [Role.SUPER_ADMIN, Role.ADMIN, Role.COMPTABLE].includes(
      authUser.role,
    );
  }

  private async findAllOverdueTuitionNotifications() {
    return await this.notificationRepository.find({
      where: { type: NotificationType.ECOLAGE_RETARD },
      relations: {
        recipient: true,
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

  private async findAllOverdueFactures() {
    const today = new Date().toISOString().slice(0, 10);

    const factures = await this.factureRepository
      .createQueryBuilder('facture')
      .leftJoinAndSelect('facture.etudiant', 'etudiant')
      .leftJoinAndSelect('facture.paiements', 'paiements')
      .where('facture.dateEcheance IS NOT NULL')
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

  private async findRecipientsForFacture(facture: Facture) {
    const recipients: User[] = [];
    const etudiantId = facture.etudiant?.id;
    if (!etudiantId) return recipients;

    const studentUser = await this.userRepository.findOne({
      where: { etudiant: { id: etudiantId } },
      relations: { etudiant: true },
    });
    if (studentUser) recipients.push(studentUser);

    const parentUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoin('parent.etudiants', 'etudiant')
      .where('etudiant.id = :etudiantId', { etudiantId })
      .getMany();

    for (const parentUser of parentUsers) {
      if (!recipients.some((recipient) => recipient.id === parentUser.id)) {
        recipients.push(parentUser);
      }
    }

    return recipients;
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
      title: 'Écolage en retard',
      message:
        "Votre paiement d'écolage est en retard. Veuillez régulariser votre situation auprès de l’administration.",
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
