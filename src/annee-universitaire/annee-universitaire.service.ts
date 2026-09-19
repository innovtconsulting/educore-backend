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
import { getAnneeLabel, getAnneeLabelLower } from '../common/utils/annee-label.util';

@Injectable()
export class AnneeUniversitaireService {
  constructor(
    @InjectRepository(AnneeUniversitaire)
    private readonly repo: Repository<AnneeUniversitaire>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepo: Repository<Etablissement>,
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

    return saved;
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
    if (!annee) {
      let etablissement: any = null;
      if (tenantId) etablissement = await this.etablissementRepo.findOneBy({ id: tenantId } as any);
      throw new NotFoundException(`${getAnneeLabel(etablissement)} #${id} non trouvée`);
    }
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

    return saved;
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
    if (!active) {
      let etablissement: any = null;
      if (tenantId) etablissement = await this.etablissementRepo.findOneBy({ id: tenantId } as any);
      throw new NotFoundException(`Aucune ${getAnneeLabelLower(etablissement)} active`);
    }
    return active;
  }
}
