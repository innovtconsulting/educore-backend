import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EnseignantModule } from '../enseignant/enseignant.module';
import { Note } from '../note/entities/note.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { NoteModule } from '../note/note.module';
import { EvaluationRoutesController } from './evaluation-routes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation, Note, Etudiant]),
    EnseignantModule,
    NoteModule,
  ],
  controllers: [EvaluationController, EvaluationRoutesController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
