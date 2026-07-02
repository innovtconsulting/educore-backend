import { IsString, IsEnum, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceType } from '../entities/notification-token.entity';

export class CreateNotificationTokenDto {
  @IsString()
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[/, {
    message:
      'Le token doit être un token Expo push valide (ExponentPushToken[...] ou ExpoPushToken[...])',
  })
  @ApiProperty()
  token!: string;

  @IsEnum(DeviceType)
  @IsOptional()
  @ApiProperty({ enum: DeviceType, required: false })
  deviceType?: DeviceType;
}
