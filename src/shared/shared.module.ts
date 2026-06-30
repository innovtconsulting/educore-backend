import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../document/entities/document.entity';
import { Submission } from '../devoir/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Submission])],
  exports: [TypeOrmModule],
})
export class SharedModule {}
