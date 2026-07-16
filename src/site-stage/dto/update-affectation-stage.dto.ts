import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { StageStatus } from '../entities/affectation-stage.entity';

export class UpdateAffectationStageDto {
  @ApiPropertyOptional({ example: 1, description: 'ID du site de stage' })
  @IsOptional()
  @IsNumber({}, { message: 'L\'ID du site de stage doit être un nombre' })
  siteStageId?: number;

  @ApiPropertyOptional({ example: 'Maternité', description: 'Service au sein du site' })
  @IsOptional()
  @IsString({ message: 'Le service doit être une chaîne' })
  service?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la nature de stage' })
  @IsOptional()
  @IsNumber({}, { message: 'L\'ID de la nature de stage doit être un nombre' })
  natureStageId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de l\'enseignant tuteur' })
  @IsOptional()
  @IsNumber({}, { message: 'L\'ID de l\'enseignant doit être un nombre' })
  enseignantId?: number;

  @ApiPropertyOptional({ enum: StageStatus, example: StageStatus.ACTIF })
  @IsOptional()
  @IsEnum(StageStatus, { message: 'Le statut est invalide' })
  statut?: StageStatus;
}
