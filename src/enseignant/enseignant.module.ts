import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnseignantService } from './enseignant.service';
import { EnseignantController } from './enseignant.controller';
import { Enseignant } from './entities/enseignant.entity';
import { Affectation } from './entities/affectation.entity';
import { Matiere } from '../matiere/entities/matiere.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enseignant,
      Affectation,
      Matiere,
      Etablissement,
      Niveau,
    ]),
  ],
  controllers: [EnseignantController],
  providers: [EnseignantService],
  exports: [EnseignantService],
})
export class EnseignantModule {}
