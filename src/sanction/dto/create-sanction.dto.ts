import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SanctionType } from '../entities/sanction.entity';

export class CreateSanctionDto {
  @ApiProperty({ example: 1, description: "ID de l'étudiant" })
  @IsNumber()
  @IsNotEmpty()
  etudiantId!: number;

  @ApiProperty({ enum: SanctionType, default: SanctionType.AVERTISSEMENT_VERBALE })
  @IsEnum(SanctionType)
  @IsNotEmpty()
  type!: SanctionType;

  @ApiProperty({ example: 'Retards répétés et absentéisme injustifié.' })
  @IsString()
  @IsNotEmpty()
  motif!: string;

  @ApiProperty({ example: '2026-06-09' })
  @IsDateString()
  @IsNotEmpty()
  dateDecision!: string;

  @ApiProperty({ example: '2026-06-10', required: false })
  @IsDateString()
  @IsOptional()
  dateDebut?: string;

  @ApiProperty({ example: '2026-06-17', required: false })
  @IsDateString()
  @IsOptional()
  dateFin?: string;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isApplied?: boolean;
}
