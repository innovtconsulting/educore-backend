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
      entities: [Etablissement, Niveau, Classe, Matiere],
      synchronize: true,
    }),
    EtablissementModule,
    ClasseModule,
    NiveauModule,
    MatiereModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
