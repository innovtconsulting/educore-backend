import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnonceService } from './annonce.service';
import { AnnonceController } from './annonce.controller';
import { Annonce } from './entities/annonce.entity';
import { NotificationTokenModule } from '../notification-token/notification-token.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Annonce]),
    NotificationTokenModule,
    SharedModule,
  ],
  controllers: [AnnonceController],
  providers: [AnnonceService],
})
export class AnnonceModule {}
