import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteStageService } from './site-stage.service';
import { SiteStageController } from './site-stage.controller';
import { SiteStage } from './entities/site-stage.entity';
import { PeriodeStage } from './entities/periode-stage.entity';
import { AffectationStage } from './entities/affectation-stage.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteStage,
      PeriodeStage,
      AffectationStage,
      Etudiant,
      Enseignant,
      AnneeUniversitaire,
    ]),
  ],
  controllers: [SiteStageController],
  providers: [SiteStageService],
  exports: [SiteStageService],
})
export class SiteStageModule {}
