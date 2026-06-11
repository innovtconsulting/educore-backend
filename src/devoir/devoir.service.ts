import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateDevoirDto } from './dto/create-devoir.dto';
import { UpdateDevoirDto } from './dto/update-devoir.dto';
import { Devoir } from './entities/devoir.entity';
import { EnseignantService } from '../enseignant/enseignant.service';
import { Role } from '../user/entities/user.entity';
import { Document } from '../document/entities/document.entity';
import { Classe } from '../classe/entities/classe.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class DevoirService {
  constructor(
    @InjectRepository(Devoir)
    private readonly devoirRepository: Repository<Devoir>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly enseignantService: EnseignantService,
  ) {}

  async create(createDevoirDto: CreateDevoirDto, user: any) {
    const { matiereId, classeId, niveauId, documentIds, ...data } =
      createDevoirDto;

    if (user.role === Role.ENSEIGNANT) {
      const queryRunner =
        this.devoirRepository.manager.connection.createQueryRunner();
      const classe = await queryRunner.manager.getRepository(Classe).findOne({
        where: { id: classeId },
        relations: { etablissements: true },
      });
      await queryRunner.release();

      if (!classe) throw new NotFoundException('Classe introuvable');

      const etablissementIds = classe.etablissements.map((e) => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        matiereId,
        niveauId,
        etablissementIds,
      );

      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de cette matière pour ce niveau dans cet établissement",
        );
      }
    }

    let documents: Document[] = [];
    if (documentIds && documentIds.length > 0) {
      documents = await this.documentRepository.findBy({ id: In(documentIds) });
    }

    const devoir = this.devoirRepository.create({
      ...data,
      matiere: { id: matiereId },
      classe: { id: classeId },
      niveau: { id: niveauId },
      enseignant: { id: user.enseignantId || user.id }, // Fallback for admin
      documents,
    });

    return await this.devoirRepository.save(devoir);
  }

  async findAll(paginationQuery: PaginationQueryDto, user?: any) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const query = this.devoirRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.matiere', 'matiere')
      .leftJoinAndSelect('d.classe', 'classe')
      .leftJoinAndSelect('d.niveau', 'niveau')
      .leftJoinAndSelect('d.enseignant', 'enseignant')
      .leftJoinAndSelect('d.documents', 'documents');

    if (user && user.role === Role.ETUDIANT) {
      // Pour un étudiant, on filtre par sa classe et son niveau
      // Ces informations doivent être récupérées via son profil
      // Mais pour simplifier ici, on pourrait passer les filtres depuis le controller
    }

    const [items, total] = await query
      .orderBy('d.deadline', 'ASC')
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

  async findByClasse(classeId: number, niveauId: number) {
    return await this.devoirRepository.find({
      where: {
        classe: { id: classeId },
        niveau: { id: niveauId },
      },
      relations: {
        matiere: true,
        enseignant: true,
        documents: true,
      },
      order: { deadline: 'ASC' },
    });
  }

  async findOne(id: number) {
    const devoir = await this.devoirRepository.findOne({
      where: { id },
      relations: {
        matiere: true,
        classe: true,
        niveau: true,
        enseignant: true,
        documents: true,
      },
    });
    if (!devoir) throw new NotFoundException(`Devoir #${id} non trouvé`);
    return devoir;
  }

  async update(id: number, updateDevoirDto: UpdateDevoirDto, user: any) {
    const devoir = await this.findOne(id);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = devoir.classe.etablissements?.map((e: any) => e.id) || [];
      // Note: findOne above needs to load etablissements if we want to check here
      // But usually only the creator can update.
      if (devoir.enseignant.id !== user.enseignantId) {
        throw new ForbiddenException("Vous ne pouvez modifier que vos propres devoirs");
      }
    }

    const { documentIds, ...data } = updateDevoirDto;
    if (documentIds) {
      devoir.documents = await this.documentRepository.findBy({ id: In(documentIds) });
    }

    Object.assign(devoir, data);
    return await this.devoirRepository.save(devoir);
  }

  async remove(id: number, user: any) {
    const devoir = await this.findOne(id);
    if (user.role === Role.ENSEIGNANT && devoir.enseignant.id !== user.enseignantId) {
      throw new ForbiddenException("Vous ne pouvez supprimer que vos propres devoirs");
    }
    return await this.devoirRepository.remove(devoir);
  }
}
