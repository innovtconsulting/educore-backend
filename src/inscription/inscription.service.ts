import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Inscription,
  InscriptionStatus,
} from '../etudiant/entities/inscription.entity';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import {
  Etudiant,
  EnrollmentStatus,
} from '../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Facture, InvoiceStatus } from '../finance/entities/facture.entity';
import { Frais } from '../finance/entities/frais.entity';
import { BulletinService } from '../bulletin/bulletin.service';
import { GlobalSettingService } from '../global-setting/global-setting.service';

@Injectable()
export class InscriptionService {
  constructor(
    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(AnneeUniversitaire)
    private readonly anneeRepo: Repository<AnneeUniversitaire>,
    @InjectRepository(Classe)
    private readonly classeRepo: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepo: Repository<Niveau>,
    @InjectRepository(Facture)
    private readonly factureRepo: Repository<Facture>,
    @InjectRepository(Frais)
    private readonly fraisRepo: Repository<Frais>,
    private readonly bulletinService: BulletinService,
    private readonly globalSettingService: GlobalSettingService,
    private readonly dataSource: DataSource,
  ) {}

  async checkEligibility(etudiantId: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: {
        etablissement: true,
        classe: true,
        niveau: true,
        inscriptions: { anneeUniversitaire: true },
      },
    });
    if (!etudiant) throw new NotFoundException('Étudiant non trouvé');

    // 1. Trouver l'année universitaire actuelle/passée de l'étudiant
    const currentInscription = etudiant.inscriptions.find(
      (i) => i.status === InscriptionStatus.ACTIF,
    );
    if (!currentInscription) {
      // Si aucune inscription active, peut-être est-ce une première inscription ?
      // Mais ici on gère la "réinscription".
      return {
        eligible: true,
        reason: 'Première inscription ou réactivation possible',
      };
    }

    const anneeId = currentInscription.anneeUniversitaire.id;

    // 2. Validation Financière : Toutes les factures de l'étudiant doivent être payées
    const unpaidInvoices = await this.factureRepo.find({
      where: [
        { etudiant: { id: etudiantId }, status: InvoiceStatus.VALIDE },
        { etudiant: { id: etudiantId }, status: InvoiceStatus.PARTIEL },
        { etudiant: { id: etudiantId }, status: InvoiceStatus.BROUILLON },
      ],
    });

    if (unpaidInvoices.length > 0) {
      return {
        eligible: false,
        reason: 'Dettes impayées détectées ou factures non validées',
        details: unpaidInvoices.map((f) => ({
          numero: f.numero,
          montant: f.montantTotal,
          status: f.status,
        })),
      };
    }

    // 3. Validation Académique
    const annee = await this.anneeRepo.findOne({
      where: { id: anneeId },
      relations: { semestres: true },
    });

    if (!annee || annee.semestres.length === 0) {
      return {
        eligible: true,
        reason:
          "Aucune donnée académique pour l'année actuelle, passage autorisé par défaut",
      };
    }

    let totalMoyenne = 0;
    let countSemestres = 0;
    let hasEliminatoire = false;

    for (const semestre of annee.semestres) {
      try {
        const bulletin = await this.bulletinService.getStudentBulletin(
          etudiantId,
          semestre.id,
        );
        totalMoyenne += bulletin.moyenneGenerale;
        if (bulletin.decisions.hasEliminatoire) hasEliminatoire = true;
        countSemestres++;
      } catch (e) {
        // Si un bulletin n'est pas encore généré pour un semestre, on l'ignore ou on lève une alerte ?
        // Pour la réinscription, on attend généralement que tous les bulletins soient clos.
      }
    }

    if (countSemestres === 0) {
      return {
        eligible: true,
        reason: 'Aucun bulletin disponible, passage autorisé',
      };
    }

    const moyenneAnnuelle = totalMoyenne / countSemestres;

    // Récupérer les seuils depuis les paramètres globaux (avec valeurs par défaut si non configurés)
    const passingGradeStr = await this.globalSettingService.getValue(
      'ACADEMIC_PASSING_GRADE',
    );
    const eliminationThresholdStr = await this.globalSettingService.getValue(
      'ACADEMIC_ELIMINATION_THRESHOLD',
    );

    const passingGrade = passingGradeStr ? parseFloat(passingGradeStr) : 10;
    const eliminationThreshold = eliminationThresholdStr
      ? parseFloat(eliminationThresholdStr)
      : 4;

    if (moyenneAnnuelle < passingGrade) {
      return {
        eligible: false,
        reason: `Moyenne annuelle de ${moyenneAnnuelle.toFixed(2)} insuffisante (Minimum requis: ${passingGrade})`,
        moyenneAnnuelle,
        passingGrade,
      };
    }

    if (hasEliminatoire) {
      return {
        eligible: false,
        reason: `Note éliminatoire détectée (Seuil: ${eliminationThreshold})`,
      };
    }

    return {
      eligible: true,
      moyenneAnnuelle,
      reason: 'Critères académiques et financiers remplis',
    };
  }

  async reinscrire(dto: CreateInscriptionDto) {
    const { etudiantId, anneeUniversitaireId, classeId, niveauId } = dto;

    // 1. Vérifier l'éligibilité
    const eligibility = await this.checkEligibility(etudiantId);
    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Réinscription refusée : ${eligibility.reason}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const etudiant = await queryRunner.manager.findOne(Etudiant, {
        where: { id: etudiantId },
        relations: { inscriptions: true, etablissement: true },
      });
      const annee = await queryRunner.manager.findOneBy(AnneeUniversitaire, {
        id: anneeUniversitaireId,
      });
      const classe = await queryRunner.manager.findOneBy(Classe, {
        id: classeId,
      });
      const niveau = await queryRunner.manager.findOneBy(Niveau, {
        id: niveauId,
      });

      if (!etudiant || !annee || !classe || !niveau)
        throw new NotFoundException(
          'Une ou plusieurs entités sont introuvables',
        );

      // 2. Clôturer l'ancienne inscription
      const oldInscription = etudiant.inscriptions.find(
        (i) => i.status === InscriptionStatus.ACTIF,
      );
      if (oldInscription) {
        oldInscription.status = InscriptionStatus.TERMINE;
        await queryRunner.manager.save(oldInscription);
      }

      // 3. Créer la nouvelle inscription
      const newInscription = queryRunner.manager.create(Inscription, {
        etudiant,
        anneeUniversitaire: annee,
        classe,
        niveau,
        etablissement: etudiant.etablissement,
        dateInscription: new Date(),
        status: InscriptionStatus.ACTIF,
      });
      await queryRunner.manager.save(newInscription);

      // 4. Mettre à jour la fiche étudiant
      etudiant.classe = classe;
      etudiant.niveau = niveau;
      await queryRunner.manager.save(etudiant);

      // 5. Automatisation financière : Générer les factures de la nouvelle année
      const frais = await queryRunner.manager.find(Frais, {
        where: {
          classe: { id: classeId },
          niveau: { id: niveauId },
          etablissementId: etudiant.etablissement.id,
        },
      });

      for (const f of frais) {
        const timestamp = Date.now();
        const facture = queryRunner.manager.create(Facture, {
          numero: `FAC-${annee.label}-${etudiant.id}-${f.type.toUpperCase()}-${timestamp}`,
          etudiant,
          dateEmission: new Date(),
          montantTotal: f.amount, // Utilisation de amount de Frais
          status: InvoiceStatus.VALIDE, // Facture directement validée
          notes: `Génération automatique - Réinscription ${annee.label} (${f.name})`,
        });
        await queryRunner.manager.save(facture);
      }

      await queryRunner.commitTransaction();
      return {
        message: 'Réinscription effectuée avec succès et facturation générée.',
        inscription: newInscription,
        moyenneAnnuelle: eligibility.moyenneAnnuelle,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getHistory(etudiantId: number) {
    return await this.inscriptionRepository.find({
      where: { etudiant: { id: etudiantId } },
      relations: { anneeUniversitaire: true, classe: true, niveau: true },
      order: { dateInscription: 'DESC' },
    });
  }

  async graduate(etudiantId: number) {
    // 1. Vérifier l'éligibilité
    const eligibility = await this.checkEligibility(etudiantId);
    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Diplomation refusée : ${eligibility.reason}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const etudiant = await queryRunner.manager.findOne(Etudiant, {
        where: { id: etudiantId },
        relations: { inscriptions: true },
      });

      if (!etudiant) throw new NotFoundException('Étudiant introuvable');

      if (etudiant.status === EnrollmentStatus.DIPLOME) {
        throw new BadRequestException('Cet étudiant est déjà diplômé');
      }

      // 2. Clôturer l'inscription actuelle
      const currentInscription = etudiant.inscriptions.find(
        (i) => i.status === InscriptionStatus.ACTIF,
      );
      if (currentInscription) {
        currentInscription.status = InscriptionStatus.TERMINE;
        await queryRunner.manager.save(currentInscription);
      }

      // 3. Mettre à jour le statut de l'étudiant
      etudiant.status = EnrollmentStatus.DIPLOME;
      await queryRunner.manager.save(etudiant);

      await queryRunner.commitTransaction();
      return {
        message: "L'étudiant a été marqué comme diplômé avec succès.",
        status: etudiant.status,
        moyenneFinale: eligibility.moyenneAnnuelle,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getGraduatesReport(tenantId?: number) {
    // Récupérer tous les étudiants diplômés du tenant
    const graduates = await this.etudiantRepository.find({
      where: {
        status: EnrollmentStatus.DIPLOME,
        etablissement: tenantId ? { id: tenantId } : undefined,
      },
      relations: {
        inscriptions: { anneeUniversitaire: true, classe: true, niveau: true },
      },
    });

    const report: any = {
      totalGraduates: graduates.length,
      byYear: {},
    };

    graduates.forEach((stu) => {
      // Trouver la dernière inscription terminée (année de diplomation)
      const lastInscription = stu.inscriptions
        .filter((i) => i.status === InscriptionStatus.TERMINE)
        .sort(
          (a, b) =>
            new Date(b.anneeUniversitaire.endDate).getTime() -
            new Date(a.anneeUniversitaire.endDate).getTime(),
        )[0];

      const yearLabel = lastInscription
        ? lastInscription.anneeUniversitaire.label
        : 'Inconnue';

      if (!report.byYear[yearLabel]) {
        report.byYear[yearLabel] = {
          count: 0,
          students: [],
        };
      }

      report.byYear[yearLabel].count++;
      report.byYear[yearLabel].students.push({
        id: stu.id,
        firstName: stu.firstName,
        lastName: stu.lastName,
        matricule: stu.matricule,
        classe: lastInscription?.classe.name,
        niveau: lastInscription?.niveau.name,
      });
    });

    return report;
  }
}
