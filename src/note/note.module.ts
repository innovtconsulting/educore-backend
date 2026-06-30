import { Module } from '@nestjs/common';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Evaluation } from '../evaluation/entities/evaluation.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { EnseignantModule } from '../enseignant/enseignant.module';
import { ParentModule } from '../parent/parent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, Evaluation, Etudiant]),
    EnseignantModule,
    ParentModule,
  ],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})
export class NoteModule {}
