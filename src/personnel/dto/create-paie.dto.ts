import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaieType } from '../entities/paie-personnel.entity';

export class CreatePaieDto {
  @ApiProperty({ enum: PaieType })
  @IsEnum(PaieType)
  type!: PaieType;

  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0.01)
  montant!: number;

  @ApiProperty({ example: '2026-07-12' })
  @IsDateString()
  datePaiement!: string;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  mois!: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2020)
  annee!: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
