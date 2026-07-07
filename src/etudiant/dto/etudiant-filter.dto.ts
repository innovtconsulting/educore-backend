import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EnrollmentStatus } from '../entities/etudiant.entity';

export class EtudiantFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrer par établissement (réservé au SuperAdmin)',
  })
  @IsOptional()
  @Type(() => Number)
  etablissementId?: number;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    description: "Filtrer par statut d'inscription",
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

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

  @ApiPropertyOptional({
    description: "Filtrer par statut du dossier (Complet ou Incomplet)",
  })
  @IsOptional()
  dossierStatus?: string;
}
