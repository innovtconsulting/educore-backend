import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FeeType } from '../entities/frais.entity';

export class CreateFraisDto {
  @ApiProperty({ example: 'Scolarité Licence 1 Informatique' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ enum: FeeType, default: FeeType.SCOLARITE })
  @IsEnum(FeeType)
  @IsOptional()
  type?: FeeType;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  classeId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  niveauId?: number;
}
