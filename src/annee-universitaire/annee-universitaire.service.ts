import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnneeUniversitaireDto } from './dto/create-annee-universitaire.dto';
import { UpdateAnneeUniversitaireDto } from './dto/update-annee-universitaire.dto';
import { AnneeUniversitaire } from './entities/annee-universitaire.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { PeriodeStage } from '../site-stage/entities/periode-stage.entity';

@Injectable()
export class AnneeUniversitaireService {
  constructor(
    @InjectRepository(AnneeUniversitaire)
    private readonly repo: Repository<AnneeUniversitaire>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepo: Repository<Etablissement>,
    @InjectRepository(PeriodeStage)
    private readonly periodeStageRepo: Repository<PeriodeStage>,
  ) {}

  async create(dto: CreateAnneeUniversitaireDto, tenantId?: number) {
    const { etablissementId: dtoEtablissementId, ...rest } = dto;
    const etablissementId = tenantId || dtoEtablissementId;

    if (!etablissementId) {
      throw new BadRequestException("ID d'établissement manquant");
    }

    const etablissement = await this.etablissementRepo.findOneBy({
      id: etablissementId,
    });
    if (!etablissement) {
      throw new NotFoundException(
        `Établissement #${etablissementId} introuvable`,
      );
    }

    if (rest.isActive) {
      await this.repo.update({ etablissementId }, { isActive: false });
    }
    const annee = this.repo.create({ ...rest, etablissement, etablissementId });
    const saved = await this.repo.save(annee);

    await this.createDefaultPeriodes(saved, etablissementId);

    return saved;
  }

  private async createDefaultPeriodes(
    annee: AnneeUniversitaire,
    etablissementId: number,
  ) {
    await this.syncDefaultPeriodes(annee, etablissementId);
  }

  async findAll(tenantId?: number) {
    const where: any = {};
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    return await this.repo.find({
      where,
      order: { label: 'DESC' },
      relations: { semestres: true },
    });
  }

  async findOne(id: number, tenantId?: number) {
    const where: any = { id };
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    const annee = await this.repo.findOne({
      where,
      relations: { semestres: true },
    });
    if (!annee)
      throw new NotFoundException(`Année universitaire #${id} non trouvée`);
    return annee;
  }

  async update(
    id: number,
    dto: UpdateAnneeUniversitaireDto,
    tenantId?: number,
  ) {
    const annee = await this.findOne(id, tenantId);

    if (dto.isActive && !annee.isActive) {
      await this.repo.update(
        { etablissementId: annee.etablissementId },
        { isActive: false },
      );
    }
    Object.assign(annee, dto);
    const saved = await this.repo.save(annee);

    if (dto.startDate || dto.endDate) {
      await this.syncDefaultPeriodes(saved, saved.etablissementId);
    }

    return saved;
  }

  private async syncDefaultPeriodes(
    annee: AnneeUniversitaire,
    etablissementId: number,
  ) {
    const existing = await this.periodeStageRepo.find({
      where: { anneeUniversitaireId: annee.id, etablissementId },
      order: { dateDebut: 'ASC' },
    });

    const start = new Date(annee.startDate);
    const end = new Date(annee.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const chunkSize = Math.floor(totalDays / 5);

    for (let i = 0; i < 5; i++) {
      const pStart = new Date(start.getTime() + i * chunkSize * 86400000);
      const pEnd = i < 4
        ? new Date(start.getTime() + (i + 1) * chunkSize * 86400000 - 86400000)
        : new Date(end);

      if (existing[i]) {
        await this.periodeStageRepo.update(existing[i].id, {
          dateDebut: pStart,
          dateFin: pEnd,
        });
      } else {
        await this.periodeStageRepo.save(
          this.periodeStageRepo.create({
            libelle: `Stage ${i + 1}`,
            dateDebut: pStart,
            dateFin: pEnd,
            anneeUniversitaireId: annee.id,
            etablissementId,
          }),
        );
      }
    }
  }

  async remove(id: number, tenantId?: number) {
    const annee = await this.findOne(id, tenantId);
    return await this.repo.remove(annee);
  }

  async getActiveYear(tenantId?: number) {
    const where: any = { isActive: true };
    if (tenantId) {
      where.etablissementId = tenantId;
    }
    const active = await this.repo.findOne({ where });
    if (!active)
      throw new NotFoundException('Aucune année universitaire active');
    return active;
  }
}
