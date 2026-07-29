import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteStageService } from './site-stage.service';
import { SiteStageController } from './site-stage.controller';
import { SiteStage } from './entities/site-stage.entity';
import { LigneStage } from './entities/ligne-stage.entity';
import { LigneStageSlot } from './entities/ligne-stage-slot.entity';
import { NatureStage } from './entities/nature-stage.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteStage,
      LigneStage,
      LigneStageSlot,
      NatureStage,
      Etudiant,
      Enseignant,
      AnneeUniversitaire,
      Classe,
      Niveau,
    ]),
    FinanceModule,
  ],
  controllers: [SiteStageController],
  providers: [SiteStageService],
  exports: [SiteStageService],
})
export class SiteStageModule {}
