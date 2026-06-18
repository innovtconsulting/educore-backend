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
  @IsNotEmpty()
  title!: string;

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
  @IsNotEmpty()
  weight!: number;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

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
