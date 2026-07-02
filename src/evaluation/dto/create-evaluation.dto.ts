import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  EvaluationType,
  EvaluationSession,
} from '../entities/evaluation.entity';

export class CreateEvaluationDto {
  @ApiProperty({ example: 'Examen Final Algorithmique' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Examen Final Algorithmique', required: false })
  @IsString()
  @IsOptional()
  titre?: string;

  @ApiProperty({ enum: EvaluationType, example: EvaluationType.EXAMEN })
  @IsEnum(EvaluationType)
  @IsNotEmpty()
  type!: EvaluationType;

  @ApiProperty({ enum: EvaluationSession, example: EvaluationSession.NORMALE })
  @IsEnum(EvaluationSession)
  @IsOptional()
  session?: EvaluationSession;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ example: 1.0, required: false })
  @IsNumber()
  @IsOptional()
  coefficient?: number;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '2026-06-15', required: false })
  @IsDateString()
  @IsOptional()
  dateEvaluation?: string;

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

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  semestreId!: number;
}
