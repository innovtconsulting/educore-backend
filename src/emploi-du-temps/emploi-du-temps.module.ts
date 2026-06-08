import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmploiDuTempsService } from './emploi-du-temps.service';
import { EmploiDuTempsController } from './emploi-du-temps.controller';
import { EmploiDuTemp } from './entities/emploi-du-temp.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Affectation } from '../enseignant/entities/affectation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmploiDuTemp,
      Matiere,
      Enseignant,
      Etablissement,
      Classe,
      Niveau,
      Affectation,
    ]),
  ],
  controllers: [EmploiDuTempsController],
  providers: [EmploiDuTempsService],
})
export class EmploiDuTempsModule {}
