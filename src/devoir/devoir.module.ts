import { Module } from '@nestjs/common';
import { DevoirService } from './devoir.service';
import { DevoirController } from './devoir.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devoir } from './entities/devoir.entity';
import { Submission } from './entities/submission.entity';
import { Document } from '../document/entities/document.entity';
import { EnseignantModule } from '../enseignant/enseignant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Devoir, Submission, Document]),
    EnseignantModule,
  ],
  controllers: [DevoirController],
  providers: [DevoirService],
  exports: [DevoirService],
})
export class DevoirModule {}
