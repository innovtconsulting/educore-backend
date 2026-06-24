import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class MatiereFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ID du niveau' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  niveauId?: number;

  @ApiPropertyOptional({ description: 'ID du parcours (classe)' })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  parcoursId?: number;
}
