import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SanctionType } from '../entities/sanction.entity';

export class SanctionFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: SanctionType,
    description: 'Filtrer par type de sanction',
  })
  @IsOptional()
  @IsEnum(SanctionType)
  type?: SanctionType;

  @ApiPropertyOptional({
    description: 'Filtrer par année universitaire',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anneeUniversitaireId?: number;
}
