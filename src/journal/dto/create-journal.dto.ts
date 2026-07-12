import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJournalDto {
  @ApiProperty({ example: 1, description: 'ID du créneau (EmploiDuTemp)' })
  @IsInt()
  @IsNotEmpty()
  emploiDuTempId!: number;

  @ApiProperty({ example: 'Introduction aux fonctions' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Rappel du cours précédent, puis exercices...' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Objectifs ou compétences abordés' })
  @IsString()
  @IsOptional()
  objectives?: string;

  @ApiPropertyOptional({ description: 'Devoirs à faire' })
  @IsString()
  @IsOptional()
  homework?: string;

  @ApiPropertyOptional({ description: 'Remarques' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
