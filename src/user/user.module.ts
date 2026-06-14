import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { EtudiantModule } from '../etudiant/etudiant.module';
import { EnseignantModule } from '../enseignant/enseignant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => EtudiantModule),
    forwardRef(() => EnseignantModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
