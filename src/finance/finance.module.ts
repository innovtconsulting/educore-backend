import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Frais } from './entities/frais.entity';
import { Facture } from './entities/facture.entity';
import { Paiement } from './entities/paiement.entity';
import { Depense } from './entities/depense.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Parent } from '../parent/entities/parent.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { AnneeUniversitaireModule } from '../annee-universitaire/annee-universitaire.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Frais,
      Facture,
      Paiement,
      Depense,
      Etudiant,
      Parent,
      Classe,
      Niveau,
    ]),
    AnneeUniversitaireModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
