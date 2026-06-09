import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EtablissementModule } from './etablissement/etablissement.module';
import { Etablissement } from './etablissement/entities/etablissement.entity';
import { ClasseModule } from './classe/classe.module';
import { Classe } from './classe/entities/classe.entity';
import { NiveauModule } from './niveau/niveau.module';
import { Niveau } from './niveau/entities/niveau.entity';
import { MatiereModule } from './matiere/matiere.module';
import { Matiere } from './matiere/entities/matiere.entity';
import { EnseignantModule } from './enseignant/enseignant.module';
import { Enseignant } from './enseignant/entities/enseignant.entity';
import { Affectation } from './enseignant/entities/affectation.entity';
import { EmploiDuTempsModule } from './emploi-du-temps/emploi-du-temps.module';
import { EmploiDuTemp } from './emploi-du-temps/entities/emploi-du-temp.entity';
import { EtudiantModule } from './etudiant/etudiant.module';
import { Etudiant } from './etudiant/entities/etudiant.entity';
import { ParentModule } from './parent/parent.module';
import { Parent } from './parent/entities/parent.entity';
import { PresenceModule } from './presence/presence.module';
import { Presence } from './presence/entities/presence.entity';
import { SanctionModule } from './sanction/sanction.module';
import { Sanction } from './sanction/entities/sanction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [
        Etablissement,
        Niveau,
        Classe,
        Matiere,
        Enseignant,
        Affectation,
        EmploiDuTemp,
        Etudiant,
        Parent,
        Presence,
        Sanction,
      ],
      synchronize: true,
    }),
    EtablissementModule,
    ClasseModule,
    NiveauModule,
    MatiereModule,
    EnseignantModule,
    EmploiDuTempsModule,
    EtudiantModule,
    ParentModule,
    PresenceModule,
    SanctionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
