import { Module } from '@nestjs/common';
import { BulletinService } from './bulletin.service';
import { BulletinController } from './bulletin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from '../note/entities/note.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { Semestre } from '../semestre/entities/semestre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Note, Etudiant, Semestre])],
  controllers: [BulletinController],
  providers: [BulletinService],
})
export class BulletinModule {}
