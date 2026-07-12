import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Classe, Niveau])],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
