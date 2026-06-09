import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Presence } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { DailyReport } from './entities/daily-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Presence, Sanction, DailyReport])],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
