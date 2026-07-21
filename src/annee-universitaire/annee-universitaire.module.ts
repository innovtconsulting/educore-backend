import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnneeUniversitaireService } from './annee-universitaire.service';
import { AnneeUniversitaireController } from './annee-universitaire.controller';
import { AnneeUniversitaire } from './entities/annee-universitaire.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { PeriodeStage } from '../site-stage/entities/periode-stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnneeUniversitaire, Etablissement, PeriodeStage])],
  controllers: [AnneeUniversitaireController],
  providers: [AnneeUniversitaireService],
  exports: [AnneeUniversitaireService],
})
export class AnneeUniversitaireModule {}
