import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnneeUniversitaireService } from './annee-universitaire.service';
import { AnneeUniversitaireController } from './annee-universitaire.controller';
import { AnneeUniversitaire } from './entities/annee-universitaire.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnneeUniversitaire])],
  controllers: [AnneeUniversitaireController],
  providers: [AnneeUniversitaireService],
  exports: [AnneeUniversitaireService],
})
export class AnneeUniversitaireModule {}
