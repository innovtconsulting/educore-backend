import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Presence, PresenceStatus } from './entities/presence.entity';
import { BulkRecordPresenceDto } from './dto/record-presence.dto';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PresenceFilterDto } from './dto/presence-filter.dto';
import { Role } from '../user/entities/user.entity';
import { TenantContext } from '../common/tenant/tenant.context';
import { TenantHelper } from '../common/tenant/tenant.helper';

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(Presence)
    private readonly presenceRepository: Repository<Presence>,
    @InjectRepository(EmploiDuTemp)
    private readonly emploiRepo: Repository<EmploiDuTemp>,
    @InjectRepository(Etudiant)
    private readonly etudiantRepo: Repository<Etudiant>,
  ) {}

  async bulkRecord(dto: BulkRecordPresenceDto): Promise<Presence[]> {
    const { emploiDuTempId, items } = dto;
    const tenantId = TenantContext.getTenantId();

    const emploi = await this.emploiRepo.findOne({
      where: TenantHelper.addTenantFilter({ id: emploiDuTempId }, tenantId),
      relations: { classe: true, niveau: true, matiere: true },
    });
    if (!emploi)
      throw new NotFoundException(`Créneau #${emploiDuTempId} introuvable`);

    const results: Presence[] = [];

    for (const item of items) {
      const etudiant = await this.etudiantRepo.findOne({
        where: TenantHelper.addTenantFilter({ id: item.etudiantId }, tenantId),
        relations: {
          classe: true,
          niveau: true,
          parents: true,
          etablissement: true,
        },
      });

      if (!etudiant) {
        throw new NotFoundException(`Étudiant #${item.etudiantId} introuvable`);
      }

      // Vérifier si l'étudiant appartient à la classe/niveau du cours
      if (
        etudiant.classe.id !== emploi.classe.id ||
        etudiant.niveau.id !== emploi.niveau.id
      ) {
        throw new BadRequestException(
          `L'étudiant ${etudiant.firstName} ${etudiant.lastName} n'appartient pas à cette classe/niveau`,
        );
      }

      let presence = await this.presenceRepository.findOne({
        where: {
          etudiant: { id: etudiant.id },
          emploiDuTemp: { id: emploi.id },
        },
      });

      if (presence) {
        presence.status = item.status;
        presence.remark = item.remark;
      } else {
        presence = this.presenceRepository.create({
          etudiant,
          emploiDuTemp: emploi,
          status: item.status,
          remark: item.remark,
        });
      }
      const savedPresence = await this.presenceRepository.save(presence);
      results.push(savedPresence);
    }

    return results;
  }

  async findAll(filterDto: PresenceFilterDto) {
    const { page = 1, limit = 15, classeId, niveauId } = filterDto;
    const skip = (page - 1) * limit;
    const tenantId = TenantContext.getTenantId();
    const where = TenantHelper.addTenantFilter(
      {},
      tenantId,
      'etudiant.etablissement',
    ) as any;

    if (classeId) {
      where.emploiDuTemp = { ...(where.emploiDuTemp || {}), classe: { id: classeId } };
    }
    if (niveauId) {
      where.emploiDuTemp = { ...(where.emploiDuTemp || {}), niveau: { id: niveauId } };
    }

    const [items, total] = await this.presenceRepository.findAndCount({
      where: where,
      relations: {
        etudiant: true,
        emploiDuTemp: { matiere: true, classe: true, niveau: true },
      },
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findBySession(emploiDuTempId: number): Promise<Presence[]> {
    const tenantId = TenantContext.getTenantId();
    const where: any = { emploiDuTemp: { id: emploiDuTempId } };
    if (tenantId) where.etudiant = { etablissement: { id: tenantId } };

    return await this.presenceRepository.find({
      where,
      relations: { etudiant: true },
    });
  }

  async getStudentStats(etudiantId: number, user?: any) {
    if (user && user.role === Role.ETUDIANT && user.etudiantId !== etudiantId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres statistiques de présence',
      );
    }

    const tenantId = TenantContext.getTenantId();
    const where: any = { etudiant: { id: etudiantId } };
    if (tenantId) where.etudiant.etablissement = { id: tenantId };

    const presences = await this.presenceRepository.find({
      where,
      relations: { emploiDuTemp: { matiere: true } },
    });

    const total = presences.length;
    const presents = presences.filter(
      (p) => p.status === PresenceStatus.PRESENT,
    ).length;
    const absents = presences.filter(
      (p) => p.status === PresenceStatus.ABSENT,
    ).length;
    const retards = presences.filter(
      (p) => p.status === PresenceStatus.RETARD,
    ).length;

    return {
      total,
      presents,
      absents,
      retards,
      history: presences,
    };
  }

  async getStudentAbsencesToday(etudiantId: number): Promise<Presence[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tenantId = TenantContext.getTenantId();
    const where: any = {
      etudiant: { id: etudiantId },
      status: PresenceStatus.ABSENT,
      emploiDuTemp: {
        startTime: Between(today, tomorrow),
      },
    };
    if (tenantId) where.etudiant = { etablissement: { id: tenantId } };

    return await this.presenceRepository.find({
      where,
      relations: { emploiDuTemp: { matiere: true } },
    });
  }
}
