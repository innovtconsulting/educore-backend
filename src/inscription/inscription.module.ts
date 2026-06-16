import { Module } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { InscriptionController } from './inscription.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inscription } from '../etudiant/entities/inscription.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Facture } from '../finance/entities/facture.entity';
import { Frais } from '../finance/entities/frais.entity';
import { BulletinModule } from '../bulletin/bulletin.module';
import { GlobalSettingModule } from '../global-setting/global-setting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inscription,
      Etudiant,
      AnneeUniversitaire,
      Classe,
      Niveau,
      Facture,
      Frais,
    ]),
    BulletinModule,
    GlobalSettingModule,
  ],
  providers: [InscriptionService],
  controllers: [InscriptionController],
  exports: [InscriptionService],
})
export class InscriptionModule {}
