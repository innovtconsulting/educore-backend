import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { StageStatus } from '../entities/ligne-stage-slot.entity';

export class UpdateLigneSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  libelle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ description: 'ID du site de stage (null pour retirer)', nullable: true })
  @IsOptional()
  @IsNumber()
  siteStageId?: number | null;

  @ApiPropertyOptional({ description: 'ID de la nature de stage (null pour retirer)', nullable: true })
  @IsOptional()
  @IsNumber()
  natureStageId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ description: "ID de l'enseignant tuteur (null pour retirer)", nullable: true })
  @IsOptional()
  @IsNumber()
  enseignantId?: number | null;

  @ApiPropertyOptional({ enum: StageStatus })
  @IsOptional()
  @IsEnum(StageStatus)
  statut?: StageStatus;
}
