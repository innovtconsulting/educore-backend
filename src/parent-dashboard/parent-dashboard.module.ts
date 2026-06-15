import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentDashboardService } from './parent-dashboard.service';
import { ParentDashboardController } from './parent-dashboard.controller';
import { Parent } from '../parent/entities/parent.entity';
import { NoteModule } from '../note/note.module';
import { PresenceModule } from '../presence/presence.module';
import { FinanceModule } from '../finance/finance.module';
import { SanctionModule } from '../sanction/sanction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parent]),
    NoteModule,
    PresenceModule,
    FinanceModule,
    SanctionModule,
  ],
  controllers: [ParentDashboardController],
  providers: [ParentDashboardService],
})
export class ParentDashboardModule {}
