import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ScheduleScopeDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  classeId!: number;

  @ApiProperty({ example: true, description: 'Applique à tous les niveaux du parcours' })
  @IsBoolean()
  allNiveaux!: boolean;

  @ApiPropertyOptional({ type: [Number], description: 'Niveaux sélectionnés si allNiveaux=false' })
  @IsArray()
  @IsOptional()
  niveauIds?: number[];
}

export class CreateEvenementDto {
  @ApiProperty({ example: 'Réunion parents-professeurs' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: '2026-07-15T08:00:00' })
  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({ example: '2026-07-15T10:00:00' })
  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @ApiPropertyOptional({ description: "ID de l'établissement (optionnel si extrait du token)" })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  etablissementId?: number;

  @ApiPropertyOptional({ description: 'Enseignant/organisateur (optionnel)' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  enseignantId?: number;

  @ApiPropertyOptional({ description: 'Salle (optionnelle)' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  salleId?: number;

  @ApiPropertyOptional({ description: "Applique l'événement à tout l'établissement (ignore scopes)" })
  @IsBoolean()
  @IsOptional()
  allEtablissement?: boolean;

  @ApiPropertyOptional({ type: [ScheduleScopeDto], description: 'Requis si allEtablissement=false' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleScopeDto)
  @IsOptional()
  scopes?: ScheduleScopeDto[];
}
