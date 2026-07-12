import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export enum JournalStatusFilter {
  NON_RENSEIGNE = 'NON_RENSEIGNE',
  RENSEIGNE = 'RENSEIGNE',
  MODIFIE = 'MODIFIE',
}

export enum JournalQuickFilter {
  TODAY = 'today',
  WEEK = 'week',
  ALL = 'all',
}

export class JournalFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par classe (parcours)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classeId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par niveau' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  niveauId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par matière' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  matiereId?: number;

  @ApiPropertyOptional({
    description:
      "Filtrer par enseignant (ignoré si l'utilisateur connecté est un enseignant)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  enseignantId?: number;

  @ApiPropertyOptional({ enum: JournalStatusFilter })
  @IsOptional()
  @IsEnum(JournalStatusFilter)
  status?: JournalStatusFilter;

  @ApiPropertyOptional({ enum: JournalQuickFilter, default: JournalQuickFilter.ALL })
  @IsOptional()
  @IsEnum(JournalQuickFilter)
  quickFilter?: JournalQuickFilter;

  @ApiPropertyOptional({ description: 'Date de début (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({ description: 'Date de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  end?: string;
}
