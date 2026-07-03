import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Presence } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from './entities/daily-report.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Enseignant } from '../enseignant/entities/enseignant.entity';
import { Classe } from '../classe/entities/classe.entity';
import { User } from '../user/entities/user.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Presence,
      Sanction,
      DailyReport,
      Etudiant,
      Enseignant,
      Classe,
      User,
      Etablissement,
    ]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
