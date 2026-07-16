import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StageStatus } from '../entities/affectation-stage.entity';

export class AffectationStageFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ID du site de stage' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  siteStageId?: number;

  @ApiPropertyOptional({ description: 'ID de la période de stage' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  periodeStageId?: number;

  @ApiPropertyOptional({ description: 'ID de l\'étudiant' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  etudiantId?: number;

  @ApiPropertyOptional({ description: 'ID de la nature de stage' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  natureStageId?: number;

  @ApiPropertyOptional({ enum: StageStatus })
  @IsOptional()
  @IsEnum(StageStatus)
  statut?: StageStatus;

  @ApiPropertyOptional({ description: 'ID de l\'enseignant tuteur' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  enseignantId?: number;
}
