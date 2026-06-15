import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { EtudiantModule } from '../etudiant/etudiant.module';
import { EnseignantModule } from '../enseignant/enseignant.module';
import { ParentModule } from '../parent/parent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => EtudiantModule),
    forwardRef(() => EnseignantModule),
    forwardRef(() => ParentModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
