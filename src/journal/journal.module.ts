import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { Journal } from './entities/journal.entity';
import { JournalHistory } from './entities/journal-history.entity';
import { EmploiDuTemp } from '../emploi-du-temps/entities/emploi-du-temp.entity';
import { User } from '../user/entities/user.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { Matiere } from '../matiere/entities/matiere.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Journal, JournalHistory, EmploiDuTemp, User, Etudiant, Niveau, Matiere]),
  ],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
