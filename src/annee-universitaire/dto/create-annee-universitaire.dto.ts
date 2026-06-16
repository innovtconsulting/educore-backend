import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAnneeUniversitaireDto {
  @ApiProperty({ example: '2025-2026', description: 'Format: YYYY-YYYY' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'Le libellé doit être au format YYYY-YYYY (ex: 2025-2026)',
  })
  label!: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
