import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateEmploiDuTempDto {
  @ApiProperty({
    example: '2026-06-08T08:00:00Z',
    description: 'Heure de début',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-06-08T10:00:00Z', description: 'Heure de fin' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  matiereId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  enseignantId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etablissementId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  classeId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  niveauId!: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  salleId?: number;
}
