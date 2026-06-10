import { Module } from '@nestjs/common';
import { SemestreService } from './semestre.service';
import { SemestreController } from './semestre.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Semestre } from './entities/semestre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Semestre])],
  controllers: [SemestreController],
  providers: [SemestreService],
})
export class SemestreModule {}
