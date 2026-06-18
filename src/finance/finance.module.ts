import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Frais } from './entities/frais.entity';
import { Facture } from './entities/facture.entity';
import { Paiement } from './entities/paiement.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Frais,
      Facture,
      Paiement,
      Etudiant,
      Classe,
      Niveau,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
