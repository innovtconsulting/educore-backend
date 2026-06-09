import { Module } from '@nestjs/common';
import { SanctionService } from './sanction.service';
import { SanctionController } from './sanction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sanction } from './entities/sanction.entity';
import { Etudiant } from '../etudiant/entities/etudiant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sanction, Etudiant])],
  controllers: [SanctionController],
  providers: [SanctionService],
  exports: [SanctionService],
})
export class SanctionModule {}
