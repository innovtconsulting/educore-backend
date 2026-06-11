import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
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
}
