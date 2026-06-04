import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtablissementService } from './etablissement.service';
import { EtablissementController } from './etablissement.controller';
import { Etablissement } from './entities/etablissement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Etablissement])],
  controllers: [EtablissementController],
  providers: [EtablissementService],
})
export class EtablissementModule {}
