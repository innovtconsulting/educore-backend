import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalSettingService } from './global-setting.service';
import { GlobalSettingController } from './global-setting.controller';
import { GlobalSetting } from './entities/global-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GlobalSetting])],
  controllers: [GlobalSettingController],
  providers: [GlobalSettingService],
  exports: [GlobalSettingService],
})
export class GlobalSettingModule {}
