import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { Presence } from './entities/presence.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { ParentModule } from '../parent/parent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Presence, EmploiDuTemp, Etudiant]),
    ParentModule,
  ],
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
