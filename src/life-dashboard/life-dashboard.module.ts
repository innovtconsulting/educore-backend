import { Module } from '@nestjs/common';
import { LifeDashboardService } from './life-dashboard.service';
import { LifeDashboardController } from './life-dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Presence } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from '../reporting/entities/daily-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Presence, Sanction, DailyReport])],
  controllers: [LifeDashboardController],
  providers: [LifeDashboardService],
})
export class LifeDashboardModule {}
