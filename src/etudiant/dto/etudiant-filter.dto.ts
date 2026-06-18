import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EnrollmentStatus } from '../entities/etudiant.entity';

export class EtudiantFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    description: "Filtrer par statut d'inscription",
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Filtrer par établissement',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  etablissementId?: number;
}
