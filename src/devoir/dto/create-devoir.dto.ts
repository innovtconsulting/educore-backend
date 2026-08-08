import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ScheduleScopeDto } from '../../emploi-du-temps/dto/create-evenement.dto';

export class CreateDevoirDto {
  @ApiProperty({ example: 'TP Algorithmique' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Implémenter une liste chaînée en C' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '2026-06-15T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  deadline!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  matiereId!: number;

  @ApiPropertyOptional({ description: "Vise tout l'établissement (ignore scopes)" })
  @IsBoolean()
  @IsOptional()
  allEtablissement?: boolean;

  @ApiPropertyOptional({
    type: [ScheduleScopeDto],
    description: 'Parcours/niveaux ciblés (requis si allEtablissement=false)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleScopeDto)
  @IsOptional()
  scopes?: ScheduleScopeDto[];

  @ApiProperty({ example: [1], required: false })
  @IsOptional()
  @IsNumber({}, { each: true })
  documentIds?: number[];
}
