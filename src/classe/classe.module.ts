import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClasseService } from './classe.service';
import { ClasseController } from './classe.controller';
import { Classe } from './entities/classe.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Classe, Etablissement, Niveau])],
  controllers: [ClasseController],
  providers: [ClasseService],
  exports: [ClasseService],
})
export class ClasseModule {}
