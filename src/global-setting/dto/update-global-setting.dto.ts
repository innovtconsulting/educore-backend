import { PartialType } from '@nestjs/swagger';
import { CreateGlobalSettingDto } from './create-global-setting.dto';

export class UpdateGlobalSettingDto extends PartialType(CreateGlobalSettingDto) {}
