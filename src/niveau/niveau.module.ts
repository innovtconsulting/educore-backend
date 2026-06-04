import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NiveauService } from './niveau.service';
import { NiveauController } from './niveau.controller';
import { Niveau } from './entities/niveau.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Niveau])],
  controllers: [NiveauController],
  providers: [NiveauService],
})
export class NiveauModule {}
