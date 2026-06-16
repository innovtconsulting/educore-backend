import { Module } from '@nestjs/common';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentDashboardController } from './student-dashboard.controller';
import { EtudiantModule } from '../etudiant/etudiant.module';
import { NoteModule } from '../note/note.module';
import { PresenceModule } from '../presence/presence.module';
import { DevoirModule } from '../devoir/devoir.module';
import { EmploiDuTempsModule } from '../emploi-du-temps/emploi-du-temps.module';
import { FinanceModule } from '../finance/finance.module';
import { SanctionModule } from '../sanction/sanction.module';
import { CertificateModule } from '../certificate/certificate.module';

@Module({
  imports: [
    EtudiantModule,
    NoteModule,
    PresenceModule,
    DevoirModule,
    EmploiDuTempsModule,
    FinanceModule,
    SanctionModule,
    CertificateModule,
  ],
  controllers: [StudentDashboardController],
  providers: [StudentDashboardService],
})
export class StudentDashboardModule {}
