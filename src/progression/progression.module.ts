import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';
import { ChapitreProgression } from './entities/chapitre-progression.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { User } from '../user/entities/user.entity';
import { AnneeUniversitaireModule } from '../annee-universitaire/annee-universitaire.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChapitreProgression, Matiere, User]),
    AnneeUniversitaireModule,
  ],
  controllers: [ProgressionController],
  providers: [ProgressionService],
})
export class ProgressionModule {}
