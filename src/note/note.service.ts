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
import { TenantContext } from '../common/tenant/tenant.context';
import { TenantHelper } from '../common/tenant/tenant.helper';
import { BulkCreateNoteDto } from './dto/bulk-create-note.dto';

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

    // Gérer l'unicité Étudiant/Évaluation
    let note = await this.noteRepository.findOne({
      where: {
        etudiant: { id: etudiantId },
        evaluation: { id: evaluationId },
      },
    });

    if (note) {
      Object.assign(note, data);
    } else {
      note = this.noteRepository.create({
        ...data,
        etudiant: { id: etudiantId },
        evaluation: { id: evaluationId },
      });
    }

    return await this.noteRepository.save(note);
  }

  async bulkCreate(dto: BulkCreateNoteDto, user: any) {
    const { evaluationId, items } = dto;

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

    const savedNotes: Note[] = [];
    for (const item of items) {
      let note = await this.noteRepository.findOne({
        where: {
          etudiant: { id: item.etudiantId },
          evaluation: { id: evaluationId },
        },
      });

      if (note) {
        note.value = item.value;
        note.remark = item.remark;
      } else {
        note = this.noteRepository.create({
          value: item.value,
          remark: item.remark,
          etudiant: { id: item.etudiantId },
          evaluation: { id: evaluationId },
        });
      }
      savedNotes.push(await this.noteRepository.save(note));
    }

    return savedNotes;
  }

  async findAll(paginationQuery: PaginationQueryDto, user?: any) {
    const { page = 1, limit = 15 } = paginationQuery;
    const skip = (page - 1) * limit;
    const tenantId = TenantContext.getTenantId();

    let where: any = {};
    if (user && user.role === Role.ETUDIANT) {
      where.etudiant = { id: user.etudiantId };
    } else if (user && user.etudiantId) {
      where.etudiant = { id: user.etudiantId };
    }

    where = TenantHelper.addTenantFilter(where, tenantId, 'etudiant.etablissement');

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
    const tenantId = TenantContext.getTenantId();
    let where: any = { id };
    where = TenantHelper.addTenantFilter(where, tenantId, 'etudiant.etablissement');

    const note = await this.noteRepository.findOne({
      where,
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
    const note = await this.findOne(id, user);

    if (user.role === Role.ENSEIGNANT) {
      // Re-charger les relations nécessaires pour la vérification de responsabilité
      const noteFull = await this.noteRepository.findOne({
        where: { id: note.id },
        relations: { 
          evaluation: { 
            matiere: true, 
            niveau: true,
            classe: { etablissements: true }
          } 
        },
      });
      const etablissementIds = noteFull!.evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        noteFull!.evaluation.matiere.id,
        noteFull!.evaluation.niveau.id,
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
    const note = await this.findOne(id, user);

    if (user.role === Role.ENSEIGNANT) {
      const noteFull = await this.noteRepository.findOne({
        where: { id: note.id },
        relations: { 
          evaluation: { 
            matiere: true, 
            niveau: true,
            classe: { etablissements: true }
          } 
        },
      });
      const etablissementIds = noteFull!.evaluation.classe.etablissements.map(e => e.id);
      const isResponsible = await this.enseignantService.isResponsibleFor(
        user.enseignantId,
        noteFull!.evaluation.matiere.id,
        noteFull!.evaluation.niveau.id,
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
