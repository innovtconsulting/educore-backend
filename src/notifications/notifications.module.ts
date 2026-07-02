import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { Facture } from '../finance/entities/facture.entity';
import { Frais } from '../finance/entities/frais.entity';
import { Paiement } from '../finance/entities/paiement.entity';
import { User } from '../user/entities/user.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      Facture,
      Frais,
      Paiement,
      User,
      Etudiant,
      Etablissement,
      Classe,
      Niveau,
      AnneeUniversitaire,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
