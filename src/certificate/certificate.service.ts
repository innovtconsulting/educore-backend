import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import {
  GeneratedDocument,
  AdministrativeDocumentType,
} from './entities/generated-document.entity';
import { AnneeUniversitaireService } from '../annee-universitaire/annee-universitaire.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocRepo: Repository<GeneratedDocument>,
    private readonly anneeUniversitaireService: AnneeUniversitaireService,
  ) {}

  private async resolveAnnee(anneeId?: number, tenantId?: number) {
    return anneeId
      ? await this.anneeUniversitaireService.findOne(anneeId, tenantId)
      : await this.anneeUniversitaireService.getActiveYear(tenantId);
  }

  private async loadEtudiant(etudiantId: number) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { etablissement: true, classe: true, niveau: true },
    });
    if (!etudiant) throw new NotFoundException('Étudiant non trouvé');
    return etudiant;
  }

  // Ne génère plus le PDF : la génération se fait entièrement côté
  // navigateur (jsPDF), pour ne pas consommer de RAM/CPU sur le serveur.
  // Cette méthode ne fait que rassembler les données nécessaires et
  // enregistrer une trace dans l'historique.
  async getScolarityCertificateData(
    etudiantId: number,
    anneeId?: number,
    user?: any,
    tenantId?: number,
  ) {
    const etudiant = await this.loadEtudiant(etudiantId);
    if (!etudiant.matricule)
      throw new BadRequestException(
        "L'étudiant doit avoir un matricule pour générer ce document",
      );

    const annee = await this.resolveAnnee(anneeId, tenantId);

    const history = this.generatedDocRepo.create({
      type: AdministrativeDocumentType.SCOLARITY_CERTIFICATE,
      etudiant,
      etablissement: etudiant.etablissement,
      generatedBy: user ? { id: user.id } : undefined,
      metadata: { anneeUniversitaire: annee.label },
    });
    await this.generatedDocRepo.save(history);

    return {
      etudiant: {
        firstName: etudiant.firstName,
        lastName: etudiant.lastName,
        matricule: etudiant.matricule,
        birthDate: etudiant.birthDate,
        birthPlace: etudiant.birthPlace,
        classe: etudiant.classe.name,
        niveau: etudiant.niveau.name,
      },
      etablissement: etudiant.etablissement,
      anneeUniversitaire: annee.label,
    };
  }

  async getSuccessAttestationData(
    etudiantId: number,
    anneeId?: number,
    user?: any,
    tenantId?: number,
  ) {
    const etudiant = await this.loadEtudiant(etudiantId);
    const annee = await this.resolveAnnee(anneeId, tenantId);

    // TODO: calculer une vraie moyenne générale à partir des notes de
    // l'année (via BulletinService, matière par matière) plutôt que ces
    // valeurs de démonstration — non demandé pour l'instant.
    const metadata = {
      anneeUniversitaire: annee.label,
      moyenneGenerale: 14.25,
      mention: 'Bien',
    };

    const history = this.generatedDocRepo.create({
      type: AdministrativeDocumentType.SUCCESS_ATTESTATION,
      etudiant,
      etablissement: etudiant.etablissement,
      generatedBy: user ? { id: user.id } : undefined,
      metadata,
    });
    await this.generatedDocRepo.save(history);

    return {
      etudiant: {
        firstName: etudiant.firstName,
        lastName: etudiant.lastName,
        matricule: etudiant.matricule,
        classe: etudiant.classe.name,
        niveau: etudiant.niveau.name,
      },
      etablissement: etudiant.etablissement,
      anneeUniversitaire: metadata.anneeUniversitaire,
      moyenneGenerale: metadata.moyenneGenerale,
      mention: metadata.mention,
    };
  }

  async getHistory(
    paginationQuery: PaginationQueryDto,
    etudiantId?: number,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (etudiantId) where.etudiant = { id: etudiantId };

    const filteredWhere = TenantHelper.addTenantFilter(where, tenantId);

    const [items, total] = await this.generatedDocRepo.findAndCount({
      where: filteredWhere,
      relations: { etudiant: true, generatedBy: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
