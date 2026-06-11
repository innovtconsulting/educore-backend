import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Evaluation } from '../evaluation/entities/evaluation.entity';
import { EnseignantService } from '../enseignant/enseignant.service';
import { Role } from '../user/entities/user.entity';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    private readonly enseignantService: EnseignantService,
  ) {}

  async create(createNoteDto: CreateNoteDto, user: any) {
    const { etudiantId, evaluationId, ...data } = createNoteDto;

    const evaluation = await this.evaluationRepository.findOne({
      where: { id: evaluationId },
      relations: { 
        matiere: true, 
        niveau: true,
        classe: { etablissements: true }
      },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        evaluation.matiere.id,
        evaluation.niveau.id,
        etablissementIds,
      );
      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de la matière de cette évaluation",
        );
      }
    }

    const note = this.noteRepository.create({
      ...data,
      etudiant: { id: etudiantId },
      evaluation: { id: evaluationId },
    });
    return await this.noteRepository.save(note);
  }

  async findAll(paginationQuery: PaginationQueryDto, user?: any) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (user && user.role === Role.ETUDIANT) {
      where.etudiant = { id: user.etudiantId };
    }

    const [items, total] = await this.noteRepository.findAndCount({
      where,
      relations: {
        etudiant: true,
        evaluation: { matiere: true, semestre: true },
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

  async findOne(id: number, user?: any) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: {
        etudiant: true,
        evaluation: { matiere: true, semestre: true },
      },
    });
    if (!note) throw new NotFoundException(`Note #${id} non trouvée`);

    if (user && user.role === Role.ETUDIANT && note.etudiant.id !== user.etudiantId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à consulter cette note");
    }
    
    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto, user: any) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: { 
        evaluation: { 
          matiere: true, 
          niveau: true,
          classe: { etablissements: true }
        } 
      },
    });
    if (!note) throw new NotFoundException(`Note #${id} non trouvée`);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = note.evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        note.evaluation.matiere.id,
        note.evaluation.niveau.id,
        etablissementIds,
      );
      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de la matière de cette évaluation",
        );
      }
    }

    Object.assign(note, updateNoteDto);
    return await this.noteRepository.save(note);
  }

  async remove(id: number, user: any) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: { 
        evaluation: { 
          matiere: true, 
          niveau: true,
          classe: { etablissements: true }
        } 
      },
    });
    if (!note) throw new NotFoundException(`Note #${id} non trouvée`);

    if (user.role === Role.ENSEIGNANT) {
      const etablissementIds = note.evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        note.evaluation.matiere.id,
        note.evaluation.niveau.id,
        etablissementIds,
      );
      if (!isResponsible) {
        throw new ForbiddenException(
          "Vous n'êtes pas responsable de la matière de cette évaluation",
        );
      }
    }

    return await this.noteRepository.remove(note);
  }
}
