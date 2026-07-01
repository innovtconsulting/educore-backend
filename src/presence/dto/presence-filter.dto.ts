import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PresenceStatus } from '../entities/presence.entity';

export class PresenceFilterDto extends PaginationQueryDto {
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
    description: 'Date de début (ISO 8601)',
    example: '2026-06-01T00:00:00',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (ISO 8601)',
    example: '2026-06-30T23:59:59',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: PresenceStatus,
  })
  @IsOptional()
  @IsEnum(PresenceStatus)
  status?: PresenceStatus;
}
