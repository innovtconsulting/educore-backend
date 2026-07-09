import { Module } from '@nestjs/common';
import { SanctionService } from './sanction.service';
import { SanctionController } from './sanction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sanction } from './entities/sanction.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { AnneeUniversitaireModule } from '../annee-universitaire/annee-universitaire.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sanction, Etudiant]),
    AnneeUniversitaireModule,
  ],
  controllers: [SanctionController],
  providers: [SanctionService],
  exports: [SanctionService],
})
export class SanctionModule {}
