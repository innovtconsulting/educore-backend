import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtudiantService } from './etudiant.service';
import { EtudiantController } from './etudiant.controller';
import { Etudiant } from './entities/etudiant.entity';
import { Etablissement } from '../etablissement/entities/etablissement.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';
import { ParentModule } from '../parent/parent.module';
import { UserModule } from '../user/user.module';
import { ClasseModule } from '../classe/classe.module';
import { NiveauModule } from '../niveau/niveau.module';
import { AnneeUniversitaireModule } from '../annee-universitaire/annee-universitaire.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etudiant, Etablissement, Classe, Niveau]),
    ParentModule,
    forwardRef(() => UserModule),
    ClasseModule,
    NiveauModule,
    AnneeUniversitaireModule,
  ],
  controllers: [EtudiantController],
  providers: [EtudiantService],
  exports: [EtudiantService, TypeOrmModule],
})
export class EtudiantModule {}
