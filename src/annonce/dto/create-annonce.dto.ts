import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TargetAudience } from '../entities/annonce.entity';

export class CreateAnnonceDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  title!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  content!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TargetAudience, { each: true })
  @ApiProperty({ enum: TargetAudience, required: false, isArray: true })
  targetAudiences?: TargetAudience[];
}
