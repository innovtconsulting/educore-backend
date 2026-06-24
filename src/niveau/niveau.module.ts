import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NiveauService } from './niveau.service';
import { NiveauController } from './niveau.controller';
import { Niveau } from './entities/niveau.entity';
import { Classe } from '../classe/entities/classe.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Niveau, Classe])],
  controllers: [NiveauController],
  providers: [NiveauService],
  exports: [NiveauService],
})
export class NiveauModule {}
