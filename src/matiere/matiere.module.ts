import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatiereService } from './matiere.service';
import { MatiereController } from './matiere.controller';
import { Matiere } from './entities/matiere.entity';
import { Classe } from '../classe/entities/classe.entity';
import { Niveau } from '../niveau/entities/niveau.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Matiere, Classe, Niveau])],
  controllers: [MatiereController],
  providers: [MatiereService],
})
export class MatiereModule {}
