import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SettingCategory } from '../entities/global-setting.entity';

export class CreateGlobalSettingDto {
  @ApiProperty({ example: 'ACADEMIC_PASSING_GRADE' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: '10' })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiProperty({ example: 'Moyenne de passage par défaut' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: SettingCategory, default: SettingCategory.SYSTEM })
  @IsEnum(SettingCategory)
  @IsOptional()
  category?: SettingCategory;
}
