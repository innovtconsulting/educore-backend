import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AclService } from './acl.service';
import { AclController } from './acl.controller';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [AclController],
  providers: [AclService],
  exports: [AclService, TypeOrmModule],
})
export class AclModule {}
