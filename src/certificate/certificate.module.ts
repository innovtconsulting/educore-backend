import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { Etudiant } from '../etudiant/entities/etudiant.entity';
import { AnneeUniversitaire } from '../annee-universitaire/entities/annee-universitaire.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { BulletinModule } from '../bulletin/bulletin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Etudiant, AnneeUniversitaire, GeneratedDocument]),
    BulletinModule,
  ],
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
