import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTokenService } from './notification-token.service';
import { NotificationTokenController } from './notification-token.controller';
import { NotificationToken } from './entities/notification-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationToken])],
  controllers: [NotificationTokenController],
  providers: [NotificationTokenService],
  exports: [NotificationTokenService],
})
export class NotificationTokenModule {}
