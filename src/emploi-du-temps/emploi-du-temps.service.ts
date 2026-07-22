import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CreateEmploiDuTempDto } from './dto/create-emploi-du-temp.dto';
import { UpdateEmploiDuTempDto } from './dto/update-emploi-du-temp.dto';
import { CreateEvenementDto } from './dto/create-evenement.dto';
import { EmploiDuTemp, EmploiDuTempType } from './entities/emploi-du-temp.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Salle } from '../salle/entities/salle.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class EmploiDuTempsService {
  constructor(
    @InjectRepository(EmploiDuTemp)
    private readonly emploiDuTempRepository: Repository<EmploiDuTemp>,
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
    @InjectRepository(Enseignant)
    private readonly enseignantRepository: Repository<Enseignant>,
    @InjectRepository(Etablissement)
    private readonly etablissementRepository: Repository<Etablissement>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(Niveau)
    private readonly niveauRepository: Repository<Niveau>,
    @InjectRepository(Salle)
    private readonly salleRepository: Repository<Salle>,
    @InjectRepository(Affectation)
    private readonly affectationRepository: Repository<Affectation>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createEmploiDuTempDto: CreateEmploiDuTempDto,
  ): Promise<EmploiDuTemp> {
    const {
      startTime,
      endTime,
      matiereId,
      enseignantId,
      etablissementId,
      classeId,
      niveauId,
      salleId,
      groupeId,
    } = createEmploiDuTempDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException(
        "L'heure de début doit être avant l'heure de fin",
      );
    }

    // 1. Vérifier l'existence des entités
    const matiere = await this.matiereRepository.findOne({
      where: { id: matiereId },
      relations: { niveaux: { classe: true } },
    });
    if (!matiere)
      throw new NotFoundException(`Matière ${matiereId} introuvable`);

    // Vérification de la cohérence académique : La matière doit être liée à la classe et au niveau
    const hasClasse = matiere.niveaux?.some((n) => n.classe.id === classeId);
    const hasNiveau = matiere.niveaux?.some((n) => n.id === niveauId);

    if (!hasClasse || !hasNiveau) {
      throw new BadRequestException(
        "Cette matière n'est pas prévue pour cette classe ou ce niveau",
      );
    }

    const enseignant = await this.enseignantRepository.findOneBy({
      id: enseignantId,
    });
    if (!enseignant)
      throw new NotFoundException(`Enseignant ${enseignantId} introuvable`);

    const etablissement = await this.etablissementRepository.findOneBy({
      id: etablissementId,
    });
    if (!etablissement)
      throw new NotFoundException(
        `Établissement ${etablissementId} introuvable`,
      );

    const classe = await this.classeRepository.findOneBy({ id: classeId });
    if (!classe) throw new NotFoundException(`Classe ${classeId} introuvable`);

    const niveau = await this.niveauRepository.findOneBy({ id: niveauId });
    if (!niveau) throw new NotFoundException(`Niveau ${niveauId} introuvable`);

    let salle: Salle | undefined;
    if (salleId) {
      salle =
        (await this.salleRepository.findOneBy({ id: salleId })) || undefined;
      if (!salle) throw new NotFoundException(`Salle ${salleId} introuvable`);
    }

    // 2. Vérifier l'affectation de l'enseignant
    const affectation = await this.affectationRepository.findOne({
      where: {
        enseignant: { id: enseignantId },
        matiere: { id: matiereId },
        etablissement: { id: etablissementId },
        niveau: { id: niveauId },
      },
    });
    if (!affectation) {
      throw new BadRequestException(
        "L'enseignant n'est pas affecté à cette matière/établissement/niveau",
      );
    }

    // 3. Vérifier les conflits
    await this.checkConflicts(
      start,
      end,
      enseignantId,
      niveauId,
      undefined,
      salleId,
      groupeId,
    );

    const newEmploi = this.emploiDuTempRepository.create({
      startTime: start,
      endTime: end,
      matiere,
      enseignant,
      etablissement,
      classe,
      niveau,
      salle,
      groupeId,
    });

    return await this.emploiDuTempRepository.save(newEmploi);
  }

  private async checkEnseignantConflict(
    start: Date,
    end: Date,
    enseignantId: number,
    excludeId?: number,
    groupeId?: string,
  ) {
    const queryBuilder = this.emploiDuTempRepository
      .createQueryBuilder('e')
      .where('e.enseignantId = :enseignantId', { enseignantId })
      .andWhere(':start < e.endTime AND :end > e.startTime', { start, end });

    if (excludeId) {
      queryBuilder.andWhere('e.id != :excludeId', { excludeId });
    }
    if (groupeId) {
      queryBuilder.andWhere('(e.groupeId IS NULL OR e.groupeId != :groupeId)', { groupeId });
    }

    const conflict = await queryBuilder.getOne();

    if (conflict) {
      throw new BadRequestException(
        "L'enseignant a déjà un cours sur cette plage horaire",
      );
    }
  }

  private async checkNiveauConflict(
    start: Date,
    end: Date,
    niveauId: number,
    excludeId?: number,
  ) {
    // Le conflit se vérifie au niveau du groupe d'élèves réel (le niveau),
    // pas au niveau de la classe/filière qui peut regrouper plusieurs
    // niveaux occupés simultanément par des cours différents.
    const conflict = await this.emploiDuTempRepository
      .createQueryBuilder('e')
      .where('e.niveauId = :niveauId', { niveauId })
      .andWhere(':start < e.endTime AND :end > e.startTime', { start, end })
      .andWhere(excludeId ? 'e.id != :excludeId' : '1=1', { excludeId })
      .getOne();

    if (conflict) {
      throw new BadRequestException(
        'Ce niveau est déjà occupé sur cette plage horaire',
      );
    }
  }

  private async checkSalleConflict(
    start: Date,
    end: Date,
    salleId: number,
    excludeId?: number,
  ) {
    const conflict = await this.emploiDuTempRepository
      .createQueryBuilder('e')
      .where('e.salleId = :salleId', { salleId })
      .andWhere(':start < e.endTime AND :end > e.startTime', { start, end })
      .andWhere(excludeId ? 'e.id != :excludeId' : '1=1', { excludeId })
      .getOne();

    if (conflict) {
      throw new BadRequestException(
        'La salle est déjà occupée sur cette plage horaire',
      );
    }
  }

  private async checkConflicts(
    start: Date,
    end: Date,
    enseignantId: number,
    niveauId: number,
    excludeId?: number,
    salleId?: number,
    groupeId?: string,
  ) {
    await this.checkEnseignantConflict(start, end, enseignantId, excludeId, groupeId);
    await this.checkNiveauConflict(start, end, niveauId, excludeId);
    if (salleId) {
      await this.checkSalleConflict(start, end, salleId, excludeId);
    }
  }

  async createEvenement(
    dto: CreateEvenementDto,
    tenantId?: number,
  ): Promise<{ groupeId: string; count: number; items: EmploiDuTemp[] }> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (start >= end) {
      throw new BadRequestException(
        "L'heure de début doit être avant l'heure de fin",
      );
    }

    const finalEtablissementId = tenantId || dto.etablissementId;
    if (!finalEtablissementId) {
      throw new BadRequestException("ID d'établissement manquant");
    }
    const etablissement = await this.etablissementRepository.findOneBy({
      id: finalEtablissementId,
    });
    if (!etablissement) {
      throw new NotFoundException(
        `Établissement ${finalEtablissementId} introuvable`,
      );
    }

    let enseignant: Enseignant | undefined;
    if (dto.enseignantId) {
      enseignant =
        (await this.enseignantRepository.findOneBy({
          id: dto.enseignantId,
        })) || undefined;
      if (!enseignant) {
        throw new NotFoundException(
          `Enseignant ${dto.enseignantId} introuvable`,
        );
      }
    }

    let salle: Salle | undefined;
    if (dto.salleId) {
      salle =
        (await this.salleRepository.findOneBy({ id: dto.salleId })) ||
        undefined;
      if (!salle) throw new NotFoundException(`Salle ${dto.salleId} introuvable`);
    }

    const pairs: { classe: Classe; niveau: Niveau }[] = [];

    if (dto.allEtablissement) {
      const classes = await this.classeRepository.find({
        where: { etablissement: { id: finalEtablissementId } },
        relations: { niveaux: true },
      });
      for (const classe of classes) {
        for (const niveau of classe.niveaux ?? []) {
          pairs.push({ classe, niveau });
        }
      }
    } else {
      if (!dto.scopes || dto.scopes.length === 0) {
        throw new BadRequestException(
          'Sélectionnez au moins un niveau ou activez "Tout l\'établissement"',
        );
      }
      for (const scope of dto.scopes) {
        const classe = await this.classeRepository.findOne({
          where: { id: scope.classeId, etablissement: { id: finalEtablissementId } },
          relations: { niveaux: true },
        });
        if (!classe) {
          throw new NotFoundException(`Parcours #${scope.classeId} introuvable`);
        }

        let niveaux: Niveau[];
        if (scope.allNiveaux) {
          niveaux = classe.niveaux ?? [];
        } else {
          const requestedIds = scope.niveauIds ?? [];
          niveaux = (classe.niveaux ?? []).filter((n) =>
            requestedIds.includes(n.id),
          );
          if (niveaux.length !== requestedIds.length) {
            throw new BadRequestException(
              `Un ou plusieurs niveaux sélectionnés n'appartiennent pas au parcours "${classe.name}"`,
            );
          }
        }
        for (const niveau of niveaux) {
          pairs.push({ classe, niveau });
        }
      }
    }

    if (pairs.length === 0) {
      throw new BadRequestException('Aucun niveau sélectionné pour cet événement');
    }

    // Conflits vérifiés contre l'existant uniquement — les nouvelles lignes
    // partagent volontairement le même enseignant/horaire/salle (une seule
    // session logique diffusée à plusieurs niveaux).
    if (enseignant) {
      await this.checkEnseignantConflict(start, end, enseignant.id);
    }
    if (salle) {
      await this.checkSalleConflict(start, end, salle.id);
    }
    const distinctNiveauIds = [...new Set(pairs.map((p) => p.niveau.id))];
    for (const niveauId of distinctNiveauIds) {
      await this.checkNiveauConflict(start, end, niveauId);
    }

    const groupeId = randomUUID();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = pairs.map((pair) =>
        queryRunner.manager.create(EmploiDuTemp, {
          type: EmploiDuTempType.EVENEMENT,
          title: dto.title,
          startTime: start,
          endTime: end,
          etablissement,
          enseignant,
          salle,
          classe: pair.classe,
          niveau: pair.niveau,
          groupeId,
        }),
      );
      const saved = await queryRunner.manager.save(EmploiDuTemp, rows);
      await queryRunner.commitTransaction();
      return { groupeId, count: saved.length, items: saved };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    classeId?: number,
    niveauId?: number,
    start?: string,
    end?: string,
    enseignantId?: number,
    tenantId?: number,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const query = this.emploiDuTempRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.matiere', 'matiere')
      .leftJoinAndSelect('e.enseignant', 'enseignant')
      .leftJoinAndSelect('e.etablissement', 'etablissement')
      .leftJoinAndSelect('e.classe', 'classe')
      .leftJoinAndSelect('e.niveau', 'niveau')
      .leftJoinAndSelect('e.salle', 'salle');

    if (tenantId) query.andWhere('e.etablissementId = :tenantId', { tenantId });
    if (classeId) query.andWhere('e.classeId = :classeId', { classeId });
    if (niveauId) query.andWhere('e.niveauId = :niveauId', { niveauId });
    if (enseignantId)
      query.andWhere('e.enseignantId = :enseignantId', { enseignantId });
    if (start && end) {
      query.andWhere('e.startTime BETWEEN :start AND :end', {
        start: new Date(start),
        end: new Date(end),
      });
    }

    const [items, total] = await query
      .orderBy('e.startTime', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getTotalHoursByTeacherAndSubject(
    enseignantId: number,
    matiereId: number,
    start?: string,
    end?: string,
    tenantId?: number,
  ): Promise<{ hours: number; sessions: number }> {
    const query = this.emploiDuTempRepository
      .createQueryBuilder('e')
      .where('e.enseignantId = :enseignantId', { enseignantId })
      .andWhere('e.matiereId = :matiereId', { matiereId });

    if (tenantId) {
      query.andWhere('e.etablissementId = :tenantId', { tenantId });
    }
    if (start) {
      query.andWhere('e.startTime >= :start', { start: new Date(start) });
    }
    if (end) {
      query.andWhere('e.endTime <= :end', { end: new Date(end) });
    }

    const emplois = await query.getMany();
    const totalMs = emplois.reduce(
      (sum, emploi) =>
        sum + (emploi.endTime.getTime() - emploi.startTime.getTime()),
      0,
    );
    return {
      hours: Number((totalMs / (1000 * 60 * 60)).toFixed(2)),
      sessions: emplois.length,
    };
  }

  async findOne(id: number, tenantId?: number): Promise<EmploiDuTemp> {
    const where: any = { id };
    if (tenantId) where.etablissement = { id: tenantId };

    const emploi = await this.emploiDuTempRepository.findOne({
      where,
      relations: {
        matiere: true,
        enseignant: true,
        etablissement: true,
        classe: true,
        niveau: true,
        salle: true,
      },
    });
    if (!emploi)
      throw new NotFoundException(`Emploi du temps ${id} introuvable`);
    return emploi;
  }

  async update(
    id: number,
    updateEmploiDuTempDto: UpdateEmploiDuTempDto,
    tenantId?: number,
  ): Promise<EmploiDuTemp> {
    const emploi = await this.findOne(id, tenantId);
    const {
      startTime,
      endTime,
      enseignantId,
      classeId,
      salleId,
      matiereId,
      niveauId,
    } = updateEmploiDuTempDto;

    const start = startTime ? new Date(startTime) : emploi.startTime;
    const end = endTime ? new Date(endTime) : emploi.endTime;
    const eId = enseignantId || emploi.enseignant?.id;
    const nId = niveauId || emploi.niveau.id;
    const sId = salleId !== undefined ? salleId || undefined : emploi.salle?.id;

    if (
      startTime ||
      endTime ||
      enseignantId ||
      niveauId ||
      salleId !== undefined
    ) {
      if (start >= end)
        throw new BadRequestException(
          "L'heure de début doit être avant l'heure de fin",
        );
      await this.checkNiveauConflict(start, end, nId, id);
      if (eId) await this.checkEnseignantConflict(start, end, eId, id);
      if (sId) await this.checkSalleConflict(start, end, sId, id);
    }

    if (emploi.matiere && (matiereId || niveauId || classeId)) {
      const mId = matiereId || emploi.matiere.id;
      const nId = niveauId || emploi.niveau.id;
      const clId = classeId || emploi.classe.id;

      const matiere = await this.matiereRepository.findOne({
        where: { id: mId },
        relations: { niveaux: { classe: true } },
      });

      if (matiere) {
        const hasClasse = matiere.niveaux?.some((n) => n.classe.id === clId);
        const hasNiveau = matiere.niveaux?.some((n) => n.id === nId);
        if (!hasClasse || !hasNiveau) {
          throw new BadRequestException(
            "Cette matière n'est pas prévue pour cette classe ou ce niveau",
          );
        }
      }
    }

    if (salleId) {
      const salle = await this.salleRepository.findOneBy({ id: salleId });
      if (!salle) throw new NotFoundException(`Salle ${salleId} introuvable`);
      emploi.salle = salle;
    } else if (salleId === null) {
      emploi.salle = undefined;
    }

    Object.assign(emploi, updateEmploiDuTempDto);
    return await this.emploiDuTempRepository.save(emploi);
  }

  async remove(id: number, tenantId?: number): Promise<void> {
    const emploi = await this.findOne(id, tenantId);
    await this.emploiDuTempRepository.remove(emploi);
  }
}
