import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsDateString,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DemiJournee, PresenceStatus } from '../entities/presence.entity';

export class HalfDayPresenceItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  etudiantId: number;

  @ApiProperty({ example: 'Présent', enum: PresenceStatus })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;

  @ApiPropertyOptional({ example: 'Arrivé en retard' })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class BulkRecordHalfDayPresenceDto {
  @ApiProperty({ example: 1, description: 'ID de la classe (Classe/Parcours) – Chérubin' })
  @IsInt()
  classeId: number;

  @ApiProperty({ example: 2, description: 'ID du niveau' })
  @IsInt()
  niveauId: number;

  @ApiProperty({ example: '2026-09-18', description: 'Date YYYY-MM-DD' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: DemiJournee, example: DemiJournee.MATIN })
  @IsEnum(DemiJournee)
  demiJournee: DemiJournee;

  @ApiProperty({ type: [HalfDayPresenceItemDto] })
  @ValidateNested({ each: true })
  @Type(() => HalfDayPresenceItemDto)
  items: HalfDayPresenceItemDto[];
}

export class HalfDayPresenceFilterDto {
  @ApiPropertyOptional({ description: 'Filtrer par classe' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classeId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par niveau' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  niveauId?: number;

  @ApiPropertyOptional({ description: 'Date YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: DemiJournee })
  @IsOptional()
  @IsEnum(DemiJournee)
  demiJournee?: DemiJournee;
}
