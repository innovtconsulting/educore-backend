import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
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

  @ApiProperty({ type: [FeeScopeDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FeeScopeDto)
  scopes!: FeeScopeDto[];
}
