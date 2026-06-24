import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class PresenceFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrer par classe',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classeId?: number;

  @ApiPropertyOptional({
    description: 'Filtrer par niveau',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  niveauId?: number;
}
