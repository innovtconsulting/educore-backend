import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class EnseignantFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "ID de l'établissement pour filtrer les enseignants",
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  etablissementId?: number;

  @ApiPropertyOptional({
    description: 'ID de la matière pour filtrer les enseignants',
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  matiereId?: number;
}
