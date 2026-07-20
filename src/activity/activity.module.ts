import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { Note } from '../note/entities/note.entity';
import { Presence } from '../presence/entities/presence.entity';
import { Sanction } from '../sanction/entities/sanction.entity';
import { Paiement } from '../finance/entities/paiement.entity';
import { Devoir } from '../devoir/entities/devoir.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, Presence, Sanction, Paiement, Devoir, Etudiant]),
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
