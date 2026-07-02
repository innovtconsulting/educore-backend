import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Notification, NotificationType } from './entities/notification.entity';
import { Facture, InvoiceStatus } from '../finance/entities/facture.entity';
import { Frais, FeeType } from '../finance/entities/frais.entity';
import { Paiement } from '../finance/entities/paiement.entity';
import { User, Role } from '../user/entities/user.entity';
import {
  Etudiant,
  EnrollmentStatus,
} from '../etudiant/entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';

const OVERDUE_TEST_STUDENT = {
  email: 'etudiant.retard@test.com',
  username: 'etudiant_retard',
  phoneNumber: '+221770000001',
  password: 'password123',
  firstName: 'Étudiant Retard',
  lastName: 'Test',
  matricule: 'RETARD-TEST-001',
  amount: 100000,
  dueDate: '2026-06-01',
  issueDate: '2026-05-01',
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Facture)
    private readonly factureRepository: Repository<Facture>,
    @InjectRepository(Frais)
    private readonly fraisRepository: Repository<Frais>,
    @InjectRepository(Paiement)
    private readonly paiementRepository: Repository<Paiement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(AnneeUniversitaire)
    private readonly anneeUniversitaireRepository: Repository<AnneeUniversitaire>,
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

  async prepareOverdueTuitionTestStudent(authUser: any) {
    const etablissement = await this.findOrCreateTestEtablissement(authUser);
    const classe = await this.findOrCreateTestClasse(etablissement);
    const niveau = await this.findOrCreateTestNiveau(etablissement, classe);
    const anneeUniversitaire =
      await this.findOrCreateTestAnneeUniversitaire(etablissement);
    const frais = await this.findOrCreateTestFrais(
      etablissement,
      classe,
      niveau,
      anneeUniversitaire,
    );
    const etudiant = await this.findOrCreateTestEtudiant(
      etablissement,
      classe,
      niveau,
    );
    const user = await this.findOrCreateTestStudentUser(
      etudiant,
      etablissement,
    );
    const facture = await this.findOrCreateTestFacture(
      etudiant,
      frais,
      anneeUniversitaire,
      etablissement,
    );
    await this.syncAllOverdueTuitionNotifications();
    const dedupeKey = `${NotificationType.ECOLAGE_RETARD}:${user.id}:${facture.id}`;
    const notification = await this.notificationRepository.findOne({
      where: { dedupeKey },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      },
      etudiant: {
        id: etudiant.id,
        fullName: `${etudiant.firstName} ${etudiant.lastName}`,
        email: etudiant.email,
        phoneNumber: etudiant.phoneNumber,
        matricule: etudiant.matricule,
        status: etudiant.status,
      },
      facture: {
        id: facture.id,
        numero: facture.numero,
        montantTotal: Number(facture.montantTotal),
        montantPaye: 0,
        dateEcheance: facture.dateEcheance,
        status: facture.status,
      },
      notification: notification
        ? {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            isRead: notification.isRead,
            dedupeKey: notification.dedupeKey,
          }
        : null,
    };
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

  private async findOrCreateTestEtablissement(
    authUser: any,
  ): Promise<Etablissement> {
    if (authUser?.etablissementId) {
      const callerEtablissement = await this.etablissementRepository.findOne({
        where: { id: authUser.etablissementId },
      });
      if (callerEtablissement) return callerEtablissement;
    }

    const existing = await this.etablissementRepository
      .createQueryBuilder('etablissement')
      .orderBy('etablissement.id', 'ASC')
      .getOne();
    if (existing) return existing;

    const etablissement = this.etablissementRepository.create({
      name: 'EDUCORE Test',
      acronyme: 'EDUTEST',
      address: 'Adresse test',
      email: 'educore.test@example.com',
      phone: '+221770000000',
    });
    return await this.etablissementRepository.save(etablissement);
  }

  private async findOrCreateTestClasse(
    etablissement: Etablissement,
  ): Promise<Classe> {
    const name = 'Classe Retard Test';
    const existing = await this.classeRepository
      .createQueryBuilder('classe')
      .leftJoin('classe.etablissement', 'etablissement')
      .where('classe.name = :name', { name })
      .andWhere('etablissement.id = :etablissementId', {
        etablissementId: etablissement.id,
      })
      .getOne();
    if (existing) return existing;

    const classe = this.classeRepository.create({
      name,
      etablissement,
    });
    return await this.classeRepository.save(classe);
  }

  private async findOrCreateTestNiveau(
    etablissement: Etablissement,
    classe: Classe,
  ): Promise<Niveau> {
    const name = 'Niveau Retard Test';
    const existing = await this.niveauRepository
      .createQueryBuilder('niveau')
      .leftJoin('niveau.classe', 'classe')
      .where('niveau.name = :name', { name })
      .andWhere('niveau.etablissementId = :etablissementId', {
        etablissementId: etablissement.id,
      })
      .andWhere('classe.id = :classeId', { classeId: classe.id })
      .getOne();
    if (existing) return existing;

    const niveau = this.niveauRepository.create({
      name,
      classe,
      etablissement,
      etablissementId: etablissement.id,
    });
    return await this.niveauRepository.save(niveau);
  }

  private async findOrCreateTestAnneeUniversitaire(
    etablissement: Etablissement,
  ): Promise<AnneeUniversitaire> {
    const label = '2025-2026';
    const existing = await this.anneeUniversitaireRepository.findOne({
      where: {
        label,
        etablissementId: etablissement.id,
      },
    });
    if (existing) return existing;

    const anneeUniversitaire = this.anneeUniversitaireRepository.create({
      label,
      startDate: new Date('2025-10-01T00:00:00.000Z'),
      endDate: new Date('2026-09-30T00:00:00.000Z'),
      isActive: true,
      etablissement,
      etablissementId: etablissement.id,
    });
    return await this.anneeUniversitaireRepository.save(anneeUniversitaire);
  }

  private async findOrCreateTestFrais(
    etablissement: Etablissement,
    classe: Classe,
    niveau: Niveau,
    anneeUniversitaire: AnneeUniversitaire,
  ): Promise<Frais> {
    const name = 'Écolage Retard Test';
    let frais = await this.fraisRepository
      .createQueryBuilder('frais')
      .leftJoin('frais.classe', 'classe')
      .leftJoin('frais.niveau', 'niveau')
      .where('frais.name = :name', { name })
      .andWhere('frais.etablissementId = :etablissementId', {
        etablissementId: etablissement.id,
      })
      .andWhere('classe.id = :classeId', { classeId: classe.id })
      .andWhere('niveau.id = :niveauId', { niveauId: niveau.id })
      .getOne();

    if (!frais) {
      frais = this.fraisRepository.create({
        name,
        amount: OVERDUE_TEST_STUDENT.amount,
        type: FeeType.SCOLARITE,
        groupeId: randomUUID(),
        classe,
        niveau,
        anneeUniversitaire,
        anneeUniversitaireId: anneeUniversitaire.id,
        etablissement,
        etablissementId: etablissement.id,
      });
    }

    frais.amount = OVERDUE_TEST_STUDENT.amount;
    frais.type = FeeType.SCOLARITE;
    frais.classe = classe;
    frais.niveau = niveau;
    frais.anneeUniversitaire = anneeUniversitaire;
    frais.anneeUniversitaireId = anneeUniversitaire.id;
    frais.etablissement = etablissement;
    frais.etablissementId = etablissement.id;
    return await this.fraisRepository.save(frais);
  }

  private async findOrCreateTestEtudiant(
    etablissement: Etablissement,
    classe: Classe,
    niveau: Niveau,
  ): Promise<Etudiant> {
    let etudiant = await this.etudiantRepository
      .createQueryBuilder('etudiant')
      .leftJoinAndSelect('etudiant.etablissement', 'etablissement')
      .leftJoinAndSelect('etudiant.classe', 'classe')
      .leftJoinAndSelect('etudiant.niveau', 'niveau')
      .where('LOWER(etudiant.email) = LOWER(:email)', {
        email: OVERDUE_TEST_STUDENT.email,
      })
      .orWhere('etudiant.matricule = :matricule', {
        matricule: OVERDUE_TEST_STUDENT.matricule,
      })
      .getOne();

    if (!etudiant) {
      etudiant = this.etudiantRepository.create({
        firstName: OVERDUE_TEST_STUDENT.firstName,
        lastName: OVERDUE_TEST_STUDENT.lastName,
        matricule: OVERDUE_TEST_STUDENT.matricule,
      });
    }

    etudiant.firstName = OVERDUE_TEST_STUDENT.firstName;
    etudiant.lastName = OVERDUE_TEST_STUDENT.lastName;
    etudiant.email = OVERDUE_TEST_STUDENT.email;
    etudiant.phoneNumber = OVERDUE_TEST_STUDENT.phoneNumber;
    etudiant.matricule = OVERDUE_TEST_STUDENT.matricule;
    etudiant.status = EnrollmentStatus.ACTIF;
    etudiant.etablissement = etablissement;
    etudiant.classe = classe;
    etudiant.niveau = niveau;
    return await this.etudiantRepository.save(etudiant);
  }

  private async findOrCreateTestStudentUser(
    etudiant: Etudiant,
    etablissement: Etablissement,
  ): Promise<User> {
    let user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.etudiant', 'etudiant')
      .where('LOWER(user.email) = LOWER(:email)', {
        email: OVERDUE_TEST_STUDENT.email,
      })
      .getOne();

    if (!user) {
      user = this.userRepository.create({
        email: OVERDUE_TEST_STUDENT.email,
      });
    }

    user.email = OVERDUE_TEST_STUDENT.email;
    user.username = OVERDUE_TEST_STUDENT.username;
    user.password = await bcrypt.hash(OVERDUE_TEST_STUDENT.password, 10);
    user.role = Role.ETUDIANT;
    user.isActive = true;
    user.etablissement = etablissement;
    user.etablissementId = etablissement.id;
    user.etudiant = etudiant;
    return await this.userRepository.save(user);
  }

  private async findOrCreateTestFacture(
    etudiant: Etudiant,
    frais: Frais,
    anneeUniversitaire: AnneeUniversitaire,
    etablissement: Etablissement,
  ): Promise<Facture> {
    const numero = `TEST-ECOLAGE-RETARD-${etudiant.id}`;
    let facture = await this.factureRepository.findOne({
      where: {
        etudiantId: etudiant.id,
        fraisId: frais.id,
      },
    });

    if (!facture) {
      facture = await this.factureRepository.findOne({ where: { numero } });
    }

    if (!facture) {
      facture = this.factureRepository.create({
        numero,
      });
    }

    facture.numero = numero;
    facture.frais = frais;
    facture.fraisId = frais.id;
    facture.etudiant = etudiant;
    facture.etudiantId = etudiant.id;
    facture.dateEmission = new Date(
      `${OVERDUE_TEST_STUDENT.issueDate}T00:00:00.000Z`,
    );
    facture.dateEcheance = new Date(
      `${OVERDUE_TEST_STUDENT.dueDate}T00:00:00.000Z`,
    );
    facture.montantTotal = OVERDUE_TEST_STUDENT.amount;
    facture.status = InvoiceStatus.VALIDE;
    facture.anneeUniversitaire = anneeUniversitaire;
    facture.etablissement = etablissement;
    facture.etablissementId = etablissement.id;

    const savedFacture = await this.factureRepository.save(facture);
    await this.paiementRepository.delete({ factureId: savedFacture.id });
    return savedFacture;
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
        'Votre paiement d’écolage est en retard. Veuillez régulariser votre situation auprès de l’administration.',
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
