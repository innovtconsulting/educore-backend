import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteStageService } from './site-stage.service';
import { SiteStageController } from './site-stage.controller';
import { SiteStage } from './entities/site-stage.entity';
import { PeriodeStage } from './entities/periode-stage.entity';
import { AffectationStage } from './entities/affectation-stage.entity';
import { NatureStage } from './entities/nature-stage.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteStage,
      PeriodeStage,
      AffectationStage,
      NatureStage,
      Etudiant,
      Enseignant,
      AnneeUniversitaire,
    ]),
    FinanceModule,
  ],
  controllers: [SiteStageController],
  providers: [SiteStageService],
  exports: [SiteStageService],
})
export class SiteStageModule {}
