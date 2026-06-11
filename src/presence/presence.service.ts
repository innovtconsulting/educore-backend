import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presence, PresenceStatus } from './entities/presence.entity';
import { BulkRecordPresenceDto } from './dto/record-presence.dto';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Role } from '../user/entities/user.entity';

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

    const emploi = await this.emploiRepo.findOne({
      where: { id: emploiDuTempId },
      relations: { classe: true, niveau: true },
    });
    if (!emploi)
      throw new NotFoundException(`Créneau #${emploiDuTempId} introuvable`);

    const results: Presence[] = [];

    for (const item of items) {
      const etudiant = await this.etudiantRepo.findOne({
        where: { id: item.etudiantId },
        relations: { classe: true, niveau: true },
      });

      if (!etudiant) {
        throw new NotFoundException(`Étudiant #${item.etudiantId} introuvable`);
      }

      // Vérifier si l'étudiant appartient à la classe/niveau du cours
      if (
        etudiant.classe.id !== emploi.classe.id ||
        etudiant.niveau.id !== emploi.niveau.id
      ) {
        // Optionnel: on peut juste logger ou bloquer. Bloquons pour la cohérence.
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
      results.push(await this.presenceRepository.save(presence));
    }

    return results;
  }

  async findAll(paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [items, total] = await this.presenceRepository.findAndCount({
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
    return await this.presenceRepository.find({
      where: { emploiDuTemp: { id: emploiDuTempId } },
      relations: { etudiant: true },
    });
  }

  async getStudentStats(etudiantId: number, user?: any) {
    if (user && user.role === Role.ETUDIANT && user.etudiantId !== etudiantId) {
      throw new ForbiddenException("Vous ne pouvez consulter que vos propres statistiques de présence");
    }

    const presences = await this.presenceRepository.find({
      where: { etudiant: { id: etudiantId } },
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
}
