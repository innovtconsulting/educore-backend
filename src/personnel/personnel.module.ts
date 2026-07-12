import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Personnel } from './entities/personnel.entity';
import { PaiePersonnel } from './entities/paie-personnel.entity';
import { PersonnelService } from './personnel.service';
import { PersonnelController } from './personnel.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Personnel, PaiePersonnel, User])],
  controllers: [PersonnelController],
  providers: [PersonnelService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
