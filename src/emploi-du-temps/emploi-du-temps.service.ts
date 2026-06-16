import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmploiDuTempDto } from './dto/create-emploi-du-temp.dto';
import { UpdateEmploiDuTempDto } from './dto/update-emploi-du-temp.dto';
import { EmploiDuTemp } from './entities/emploi-du-temp.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Salle } from '../salle/entities/salle.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantContext } from '../common/tenant/tenant.context';

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
      relations: { classes: true, niveaux: true },
    });
    if (!matiere)
      throw new NotFoundException(`Matière ${matiereId} introuvable`);

    // Vérification de la cohérence académique : La matière doit être liée à la classe et au niveau
    const hasClasse = matiere.classes.some((c) => c.id === classeId);
    const hasNiveau = matiere.niveaux.some((n) => n.id === niveauId);

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
      classeId,
      undefined,
      salleId,
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
    });

    return await this.emploiDuTempRepository.save(newEmploi);
  }

  private async checkConflicts(
    start: Date,
    end: Date,
    enseignantId: number,
    classeId: number,
    excludeId?: number,
    salleId?: number,
  ) {
    // Conflit enseignant
    const enseignantConflict = await this.emploiDuTempRepository
      .createQueryBuilder('e')
      .where('e.enseignantId = :enseignantId', { enseignantId })
      .andWhere(':start < e.endTime AND :end > e.startTime', { start, end })
      .andWhere(excludeId ? 'e.id != :excludeId' : '1=1', { excludeId })
      .getOne();

    if (enseignantConflict) {
      throw new BadRequestException(
        "L'enseignant a déjà un cours sur cette plage horaire",
      );
    }

    // Conflit classe
    const classeConflict = await this.emploiDuTempRepository
      .createQueryBuilder('e')
      .where('e.classeId = :classeId', { classeId })
      .andWhere(':start < e.endTime AND :end > e.startTime', { start, end })
      .andWhere(excludeId ? 'e.id != :excludeId' : '1=1', { excludeId })
      .getOne();

    if (classeConflict) {
      throw new BadRequestException(
        'La classe est déjà occupée sur cette plage horaire',
      );
    }

    // Conflit salle
    if (salleId) {
      const salleConflict = await this.emploiDuTempRepository
        .createQueryBuilder('e')
        .where('e.salleId = :salleId', { salleId })
        .andWhere(':start < e.endTime AND :end > e.startTime', { start, end })
        .andWhere(excludeId ? 'e.id != :excludeId' : '1=1', { excludeId })
        .getOne();

      if (salleConflict) {
        throw new BadRequestException(
          'La salle est déjà occupée sur cette plage horaire',
        );
      }
    }
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    classeId?: number,
    niveauId?: number,
    start?: string,
    end?: string,
  ) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const tenantId = TenantContext.getTenantId();
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

  async findOne(id: number): Promise<EmploiDuTemp> {
    const tenantId = TenantContext.getTenantId();
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
  ): Promise<EmploiDuTemp> {
    const emploi = await this.findOne(id);
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
    const eId = enseignantId || emploi.enseignant.id;
    const cId = classeId || emploi.classe.id;
    const sId = salleId !== undefined ? salleId || undefined : emploi.salle?.id;

    if (
      startTime ||
      endTime ||
      enseignantId ||
      classeId ||
      salleId !== undefined
    ) {
      if (start >= end)
        throw new BadRequestException(
          "L'heure de début doit être avant l'heure de fin",
        );
      await this.checkConflicts(start, end, eId, cId, id, sId);
    }

    if (matiereId || niveauId || classeId) {
      const mId = matiereId || emploi.matiere.id;
      const nId = niveauId || emploi.niveau.id;
      const clId = classeId || emploi.classe.id;

      const matiere = await this.matiereRepository.findOne({
        where: { id: mId },
        relations: { classes: true, niveaux: true },
      });

      if (matiere) {
        const hasClasse = matiere.classes.some((c) => c.id === clId);
        const hasNiveau = matiere.niveaux.some((n) => n.id === nId);
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

  async remove(id: number): Promise<void> {
    const emploi = await this.findOne(id);
    await this.emploiDuTempRepository.remove(emploi);
  }
}
