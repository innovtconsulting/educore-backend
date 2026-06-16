import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

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

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  classeId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  niveauId!: number;

  @ApiProperty({ example: [1], required: false })
  @IsOptional()
  @IsNumber({}, { each: true })
  documentIds?: number[];
}
