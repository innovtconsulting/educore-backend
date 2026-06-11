import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtudiantService } from './etudiant.service';
import { EtudiantController } from './etudiant.controller';
import { Etudiant } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { ParentModule } from '../parent/parent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etudiant, Etablissement, Classe, Niveau]),
    ParentModule,
  ],
  controllers: [EtudiantController],
  providers: [EtudiantService],
  exports: [EtudiantService, TypeOrmModule],
})
export class EtudiantModule {}
