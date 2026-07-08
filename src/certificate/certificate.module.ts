import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { AnneeUniversitaireModule } from '../annee-universitaire/annee-universitaire.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etudiant, GeneratedDocument]),
    AnneeUniversitaireModule,
  ],
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
