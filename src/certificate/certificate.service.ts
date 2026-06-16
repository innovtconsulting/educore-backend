import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { GeneratedDocument, AdministrativeDocumentType } from './entities/generated-document.entity';
import { BulletinService } from '../bulletin/bulletin.service';
import { generateScolarityCertificatePdf, generateSuccessAttestationPdf } from './utils/pdf-templates';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { TenantContext } from '../common/tenant/tenant.context';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Etudiant)
    private readonly etudiantRepository: Repository<Etudiant>,
    @InjectRepository(AnneeUniversitaire)
    private readonly anneeRepo: Repository<AnneeUniversitaire>,
    @InjectRepository(GeneratedDocument)
    private readonly generatedDocRepo: Repository<GeneratedDocument>,
    private readonly bulletinService: BulletinService,
  ) {}

  async getScolarityCertificate(etudiantId: number, user?: any) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { etablissement: true, classe: true, niveau: true },
    });

    if (!etudiant) throw new NotFoundException('Étudiant non trouvé');
    if (!etudiant.matricule) throw new BadRequestException('L\'étudiant doit avoir un matricule pour générer ce document');

    const anneeActive = await this.anneeRepo.findOne({ where: { isActive: true } });
    if (!anneeActive) throw new NotFoundException('Aucune année universitaire active trouvée');

    const pdfUrl = await generateScolarityCertificatePdf({
      firstName: etudiant.firstName,
      lastName: etudiant.lastName,
      matricule: etudiant.matricule,
      birthDate: etudiant.birthDate ? new Date(etudiant.birthDate).toLocaleDateString('fr-FR') : null,
      birthPlace: etudiant.birthPlace,
      etablissement: etudiant.etablissement,
      classe: etudiant.classe.name,
      niveau: etudiant.niveau.name,
      anneeUniversitaire: anneeActive.label,
    });

    // Enregistrement dans l'historique
    const history = this.generatedDocRepo.create({
      type: AdministrativeDocumentType.SCOLARITY_CERTIFICATE,
      filePath: pdfUrl,
      etudiant,
      etablissement: etudiant.etablissement,
      generatedBy: user ? { id: user.id } : undefined,
      metadata: { anneeUniversitaire: anneeActive.label },
    });
    await this.generatedDocRepo.save(history);

    return { pdfUrl: `/${pdfUrl}` };
  }

  async getSuccessAttestation(etudiantId: number, anneeId?: number, user?: any) {
    const etudiant = await this.etudiantRepository.findOne({
      where: { id: etudiantId },
      relations: { etablissement: true, classe: true, niveau: true },
    });

    if (!etudiant) throw new NotFoundException('Étudiant non trouvé');

    const annee = anneeId 
      ? await this.anneeRepo.findOne({ where: { id: anneeId } })
      : await this.anneeRepo.findOne({ where: { isActive: true } });

    if (!annee) throw new NotFoundException('Année universitaire non trouvée');

    const metadata = {
      anneeUniversitaire: annee.label,
      moyenneGenerale: 14.25,
      mention: 'Bien',
    };

    const pdfUrl = await generateSuccessAttestationPdf({
      firstName: etudiant.firstName,
      lastName: etudiant.lastName,
      matricule: etudiant.matricule,
      classe: etudiant.classe.name,
      niveau: etudiant.niveau.name,
      etablissement: etudiant.etablissement,
      anneeUniversitaire: metadata.anneeUniversitaire,
      moyenneGenerale: metadata.moyenneGenerale,
      mention: metadata.mention,
    });

    // Enregistrement dans l'historique
    const history = this.generatedDocRepo.create({
      type: AdministrativeDocumentType.SUCCESS_ATTESTATION,
      filePath: pdfUrl,
      etudiant,
      etablissement: etudiant.etablissement,
      generatedBy: user ? { id: user.id } : undefined,
      metadata,
    });
    await this.generatedDocRepo.save(history);

    return { pdfUrl: `/${pdfUrl}` };
  }

  async getHistory(paginationQuery: PaginationQueryDto, etudiantId?: number) {
    const tenantId = TenantContext.getTenantId();
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (etudiantId) where.etudiant = { id: etudiantId };
    
    const filteredWhere = TenantHelper.addTenantFilter(where, tenantId);

    const [items, total] = await this.generatedDocRepo.findAndCount({
      where: filteredWhere as any,
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
