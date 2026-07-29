import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { StageStatus } from '../entities/ligne-stage-slot.entity';

export class CreateLigneSlotDto {
  @ApiProperty({ example: 1, description: 'Ordre du créneau (1 à 5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  ordre!: number;

  @ApiProperty({ example: 'Stage 1' })
  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({ description: 'ID du site de stage' })
  @IsOptional()
  @IsNumber()
  siteStageId?: number;

  @ApiPropertyOptional({ description: 'ID de la nature de stage (optionnel)' })
  @IsOptional()
  @IsNumber()
  natureStageId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ description: "ID de l'enseignant tuteur (optionnel)" })
  @IsOptional()
  @IsNumber()
  enseignantId?: number;

  @ApiPropertyOptional({ enum: StageStatus })
  @IsOptional()
  @IsEnum(StageStatus)
  statut?: StageStatus;
}

export class CreateLigneStageDto {
  @ApiProperty({ example: 1, description: 'ID du parcours' })
  @IsNumber()
  @IsNotEmpty()
  classeId!: number;

  @ApiProperty({ example: 1, description: 'ID du niveau' })
  @IsNumber()
  @IsNotEmpty()
  niveauId!: number;

  @ApiProperty({ example: 1, description: "ID de l'année universitaire" })
  @IsNumber()
  @IsNotEmpty()
  anneeUniversitaireId!: number;

  @ApiPropertyOptional({ description: "ID de l'étudiant assigné (optionnel)" })
  @IsOptional()
  @IsNumber()
  etudiantId?: number;

  @ApiPropertyOptional({ type: [CreateLigneSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLigneSlotDto)
  slots?: CreateLigneSlotDto[];
}
