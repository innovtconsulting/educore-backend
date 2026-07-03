import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { FeeType } from '../entities/frais.entity';

export class FeeScopeDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  classeId!: number;

  @ApiProperty({ example: true, description: 'Applique le frais à tous les niveaux du parcours' })
  @IsBoolean()
  allNiveaux!: boolean;

  @ApiProperty({ type: [Number], required: false, description: 'Niveaux sélectionnés si allNiveaux=false' })
  @IsArray()
  @IsOptional()
  niveauIds?: number[];
}

export class CreateFeeGroupDto {
  @ApiProperty({ example: 'Scolarité Trimestre 1', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ enum: FeeType, default: FeeType.SCOLARITE })
  @IsEnum(FeeType)
  type!: FeeType;

  @ApiProperty({ example: '2026-07-31', required: false })
  @IsDateString()
  @IsOptional()
  dateEcheance?: string;

  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 12,
    required: false,
    description: 'Mois concerné (1-12), obligatoire pour un frais de type "Écolage"',
  })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  mois?: number;

  @ApiProperty({ type: [FeeScopeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FeeScopeDto)
  scopes!: FeeScopeDto[];
}
