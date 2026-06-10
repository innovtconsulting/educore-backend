import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async create(createNoteDto: CreateNoteDto) {
    const { etudiantId, evaluationId, ...data } = createNoteDto;
    const note = this.noteRepository.create({
      ...data,
      etudiant: { id: etudiantId },
      evaluation: { id: evaluationId },
    });
    return await this.noteRepository.save(note);
  }

  async findAll() {
    return await this.noteRepository.find({
      relations: {
        etudiant: true,
        evaluation: { matiere: true, semestre: true },
      },
    });
  }

  async findOne(id: number) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: {
        etudiant: true,
        evaluation: { matiere: true, semestre: true },
      },
    });
    if (!note) throw new NotFoundException(`Note #${id} non trouvée`);
    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto) {
    const note = await this.findOne(id);
    Object.assign(note, updateNoteDto);
    return await this.noteRepository.save(note);
  }

  async remove(id: number) {
    const note = await this.findOne(id);
    return await this.noteRepository.remove(note);
  }
}
